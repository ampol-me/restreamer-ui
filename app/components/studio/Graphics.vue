<script setup lang="ts">
import { CORNERS, MAX_TEXT, type Corner, type StudioSetup } from '#shared/studio/setup';
import { pictureAsData } from '~/utils/studioImage';

// The graphics laid over the programme: name plate, banner, logo, and the picture behind the sources.
const setup = defineModel<StudioSetup>({ required: true });

const { t } = useI18n();
const toast = useToast();

const logoInput = ref<HTMLInputElement | null>(null);
const backgroundInput = ref<HTMLInputElement | null>(null);

const change = (values: Partial<StudioSetup>) => (setup.value = { ...setup.value, ...values });

const cornerItems = computed(() => {
	const labels: Record<Corner, string> = {
		'top-left': t('Top left'),
		'top-right': t('Top right'),
		'bottom-left': t('Bottom left'),
		'bottom-right': t('Bottom right'),
	};
	return CORNERS.map((value) => ({ value, label: labels[value] }));
});

async function pick(event: Event, what: 'logo' | 'background') {
	const input = event.target as HTMLInputElement;
	const file = input.files?.[0];
	input.value = '';
	if (!file) return;

	const data = what === 'logo' ? await pictureAsData(file, 640, 640, 'image/png') : await pictureAsData(file, 1920, 1080, 'image/jpeg');
	if (data === null) {
		toast.add({ title: t('The picture could not be read. Use a PNG, JPEG or WebP file.'), color: 'error' });
		return;
	}

	if (what === 'logo') {
		change({ logo: { ...setup.value.logo, image: data, show: true } });
	} else {
		change({ background: data });
	}
}
</script>

<template>
	<div class="space-y-6">
		<section class="space-y-3" :aria-label="$t('Name plate')">
			<USwitch
				:model-value="setup.lowerThird.show"
				:label="$t('Name plate')"
				:description="$t('Who is speaking, at the lower left of the picture.')"
				:disabled="setup.lowerThird.name.trim() === ''"
				@update:model-value="(show) => change({ lowerThird: { ...setup.lowerThird, show } })"
			/>
			<UFormField :label="$t('Name')">
				<UInput
					class="w-full"
					:model-value="setup.lowerThird.name"
					:maxlength="MAX_TEXT"
					@update:model-value="
						(name) => change({ lowerThird: { ...setup.lowerThird, name: String(name), show: setup.lowerThird.show && String(name).trim() !== '' } })
					"
				/>
			</UFormField>
			<UFormField :label="$t('Title')" :hint="$t('Optional')">
				<UInput
					class="w-full"
					:model-value="setup.lowerThird.title"
					:maxlength="MAX_TEXT"
					@update:model-value="(title) => change({ lowerThird: { ...setup.lowerThird, title: String(title) } })"
				/>
			</UFormField>
		</section>

		<USeparator />

		<section class="space-y-3" :aria-label="$t('Banner')">
			<USwitch
				:model-value="setup.banner.show"
				:label="$t('Banner')"
				:description="$t('A line of text along the bottom of the picture.')"
				:disabled="setup.banner.text.trim() === ''"
				@update:model-value="(show) => change({ banner: { ...setup.banner, show } })"
			/>
			<UFormField :label="$t('Text')">
				<UTextarea
					class="w-full"
					:rows="2"
					:maxlength="300"
					:model-value="setup.banner.text"
					@update:model-value="
						(text) => change({ banner: { ...setup.banner, text: String(text), show: setup.banner.show && String(text).trim() !== '' } })
					"
				/>
			</UFormField>
			<USwitch
				:model-value="setup.banner.ticker"
				:label="$t('Scroll the text')"
				@update:model-value="(ticker) => change({ banner: { ...setup.banner, ticker } })"
			/>
		</section>

		<USeparator />

		<section class="space-y-3" :aria-label="$t('Logo')">
			<USwitch
				:model-value="setup.logo.show"
				:label="$t('Logo')"
				:disabled="setup.logo.image === ''"
				@update:model-value="(show) => change({ logo: { ...setup.logo, show } })"
			/>
			<div class="flex flex-wrap items-center gap-2">
				<img v-if="setup.logo.image" :src="setup.logo.image" alt="" class="h-11 max-w-24 rounded-md bg-accented object-contain p-1" />
				<UButton
					color="neutral"
					variant="outline"
					icon="i-lucide-upload"
					:label="setup.logo.image ? $t('Replace') : $t('Choose a picture')"
					@click="logoInput?.click()"
				/>
				<UButton
					v-if="setup.logo.image"
					color="neutral"
					variant="ghost"
					icon="i-lucide-trash-2"
					:label="$t('Remove')"
					@click="change({ logo: { ...setup.logo, image: '', show: false } })"
				/>
				<input ref="logoInput" type="file" accept="image/png,image/jpeg,image/webp" class="hidden" @change="(e) => pick(e, 'logo')" />
			</div>
			<div v-if="setup.logo.image" class="grid gap-3 sm:grid-cols-2">
				<UFormField :label="$t('Corner')">
					<USelect
						class="w-full"
						:items="cornerItems"
						:model-value="setup.logo.corner"
						@update:model-value="(corner) => change({ logo: { ...setup.logo, corner: corner as Corner } })"
					/>
				</UFormField>
				<UFormField :label="$t('Size')">
					<USlider
						class="py-4"
						:min="5"
						:max="30"
						:model-value="setup.logo.size"
						:aria-label="$t('Size')"
						@update:model-value="(size) => change({ logo: { ...setup.logo, size: Number(size) } })"
					/>
				</UFormField>
			</div>
		</section>

		<USeparator />

		<section class="space-y-3" :aria-label="$t('Background')">
			<div>
				<h3 class="text-sm font-medium text-highlighted">{{ $t('Background') }}</h3>
				<p class="text-sm text-muted">{{ $t('Shown behind the sources where a layout leaves room.') }}</p>
			</div>
			<div class="flex flex-wrap items-center gap-2">
				<img v-if="setup.background" :src="setup.background" alt="" class="h-11 rounded-md object-cover" />
				<UButton
					color="neutral"
					variant="outline"
					icon="i-lucide-upload"
					:label="setup.background ? $t('Replace') : $t('Choose a picture')"
					@click="backgroundInput?.click()"
				/>
				<UButton
					v-if="setup.background"
					color="neutral"
					variant="ghost"
					icon="i-lucide-trash-2"
					:label="$t('Remove')"
					@click="change({ background: '' })"
				/>
				<input ref="backgroundInput" type="file" accept="image/png,image/jpeg,image/webp" class="hidden" @change="(e) => pick(e, 'background')" />
			</div>
		</section>
	</div>
</template>
