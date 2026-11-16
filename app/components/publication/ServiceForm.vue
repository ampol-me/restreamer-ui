<script setup lang="ts" generic="S extends Record<string, unknown>">
import type { Service, ServiceContext, ServiceField, ServiceFieldOption, ServiceOutput } from '#shared/services/types';
import type { ServiceSkills } from '#shared/core/types.publication';
import type { MetadataStream } from '#shared/metadata';
import { markLinks, splitMarked } from '#shared/publication/richText';
import type { ResolvedServiceField } from './ServiceField.vue';

// The form of one publication service, rendered from its declarative `fields`. Every change is answered
// with the new settings and the FFmpeg outputs the service derives from them.
const props = defineProps<{
	service: Service<S>;
	// As stored with the publication; the service's defaults fill what is missing.
	settings: Record<string, unknown>;
	skills: ServiceSkills;
	// Channel metadata: { name, description, license }
	metadata: Record<string, unknown>;
	// The streams of the publication after encoding.
	streams: MetadataStream[];
}>();

const emit = defineEmits<{
	// An output is null if the service cannot build it yet (e.g. no stream key).
	change: [outputs: (ServiceOutput | null)[], settings: S];
}>();

const { t, te } = useI18n();

// Service texts are English catalog keys. A key that has no translation is shown as it is; it must not
// go through t(), which would read characters such as '|' or '@' in it as message syntax.
const tr = (text: string) => (!text.includes('|') && te(text) ? t(text) : text);

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value ?? {}));

const ctx = computed<ServiceContext>(() => ({ skills: props.skills, metadata: props.metadata, streams: props.streams }));
const current = computed<S>(() => props.service.init(clone(props.settings), props.metadata));

function read(settings: unknown, key: string): unknown {
	let value = settings;
	for (const part of key.split('.')) {
		if (value === null || typeof value !== 'object') {
			return undefined;
		}
		value = (value as Record<string, unknown>)[part];
	}
	return value;
}

function write(settings: Record<string, unknown>, key: string, value: unknown) {
	const parts = key.split('.');
	const last = parts.pop() as string;
	let target = settings;
	for (const part of parts) {
		if (target[part] === null || typeof target[part] !== 'object') {
			target[part] = {};
		}
		target = target[part] as Record<string, unknown>;
	}
	target[last] = value;
}

function change(index: number, value: unknown) {
	const field = props.service.fields[index];
	if (!field) {
		return;
	}

	let next = props.service.init(clone(props.settings), props.metadata);

	if (props.service.handleChange) {
		next = props.service.handleChange(next, field.key, String(value ?? ''), ctx.value);
	} else if (field.type === 'checkbox') {
		// Like legacy: a checkbox flips what is stored, whatever the event carries.
		write(next, field.key, !read(next, field.key));
	} else if (field.type === 'multiselect') {
		write(next, field.key, value);
	} else {
		// Services measure and concatenate their settings, so numbers are kept as text like the legacy inputs did.
		write(next, field.key, String(value ?? ''));
	}

	emit('change', props.service.createOutput(next, ctx.value), next);
}

function optionsOf(field: ServiceField<S>): ServiceFieldOption<S>[] {
	const options = typeof field.options === 'function' ? field.options(current.value, ctx.value) : (field.options ?? []);
	return options.filter((option) => !option.showIf || option.showIf(current.value, ctx.value));
}

function resolve(field: ServiceField<S>, index: number): ResolvedServiceField {
	const value = read(current.value, field.key);
	const help = typeof field.help === 'function' ? field.help(current.value, ctx.value) : field.help;

	return {
		index,
		type: field.type,
		label: tr(field.label),
		help: help ? tr(help) : undefined,
		text: value === undefined || value === null ? '' : String(value),
		list: Array.isArray(value) ? value.map(String) : [],
		checked: value === true,
		items: optionsOf(field).map((option) => ({ label: tr(option.label), value: option.value, disabled: option.disabled === true })),
		link: field.link
			? {
					label: tr(field.link.label),
					href: typeof field.link.href === 'function' ? field.link.href(current.value) : field.link.href,
					disabled: field.link.disabled ? field.link.disabled(current.value) : false,
				}
			: null,
		required: field.required,
		disabled: field.disabled,
		placeholder: field.placeholder,
		min: field.min,
		max: field.max,
		step: field.step,
		rows: field.rows,
	};
}

// The same key may appear in two fields (e.g. a stream key that is also an advanced option), so fields are
// identified by their position.
const visible = computed(() =>
	props.service.fields.map((field, index) => ({ field, index })).filter(({ field }) => !field.showIf || field.showIf(current.value, ctx.value)),
);

const basic = computed(() => visible.value.filter(({ field }) => !field.advanced).map(({ field, index }) => resolve(field, index)));

// Advanced fields, grouped under their section heading in the order the sections first appear.
const advanced = computed(() => {
	const groups: { section: string; fields: ResolvedServiceField[] }[] = [];
	for (const { field, index } of visible.value) {
		if (!field.advanced) {
			continue;
		}

		const section = field.section ?? '';
		let group = groups.find((g) => g.section === section);
		if (!group) {
			group = { section, fields: [] };
			groups.push(group);
		}
		group.fields.push(resolve(field, index));
	}
	return groups;
});

const advancedOpen = ref(false);

// The catalogs key a description by its text with <0>…</0> around each link.
const description = computed(() => {
	const links = props.service.description_links ?? [];
	const marked = markLinks(props.service.description, links);
	return splitMarked(tr(marked), links);
});
</script>

<template>
	<div class="space-y-4">
		<p v-if="service.description" class="text-sm text-muted">
			<template v-for="(segment, i) in description" :key="i">
				<ULink v-if="segment.href" :to="segment.href" target="_blank" class="text-primary underline">{{ segment.text }}</ULink>
				<template v-else>{{ segment.text }}</template>
			</template>
		</p>

		<slot />

		<PublicationServiceField v-for="field in basic" :key="field.index" :field="field" @change="(v) => change(field.index, v)" />

		<template v-if="advanced.length > 0">
			<UButton
				color="neutral"
				variant="ghost"
				class="-mx-2.5"
				:icon="advancedOpen ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
				:label="$t('Advanced settings')"
				:aria-expanded="advancedOpen"
				@click="advancedOpen = !advancedOpen"
			/>

			<template v-if="advancedOpen">
				<section v-for="group in advanced" :key="group.section" class="space-y-3">
					<h4 v-if="group.section" class="text-sm font-medium text-highlighted">{{ tr(group.section) }}</h4>
					<div class="grid gap-4 sm:grid-cols-2">
						<PublicationServiceField
							v-for="field in group.fields"
							:key="field.index"
							:field="field"
							:class="{ 'sm:col-span-2': field.type === 'textarea' || field.type === 'info' }"
							@change="(v) => change(field.index, v)"
						/>
					</div>
				</section>
			</template>
		</template>

		<p v-if="service.documentation && advancedOpen" class="text-sm">
			<ULink :to="service.documentation" target="_blank" class="text-primary underline">{{ $t('Documentation') }}</ULink>
		</p>
	</div>
</template>
