<script setup lang="ts">
// The viewer site, drawn from a template. Used live by /watch and, with `preview`, by the
// template editor (no stream is loaded and nothing can be submitted there).
import { isUploadedImage, type Block, type Template } from '#shared/viewer/template';

export interface ViewerChannel {
	channelid: string;
	name: string;
	description: string;
	access: 'public' | 'passcode';
	unlocked: boolean;
	expired: boolean;
	manifest: string;
	poster: string;
}

const props = defineProps<{
	title: string;
	background: string;
	template: Template;
	channels: ViewerChannel[];
	selectedId: string | null;
	preview?: boolean;
	/** The page of one channel: the channel list is left out. */
	single?: boolean;
	checking?: boolean;
	error?: string;
}>();

const emit = defineEmits<{ select: [channelid: string]; unlock: [channelid: string, passcode: string]; leave: [] }>();

const { t } = useI18n();
const toast = useToast();

// Without the channel list a column may end up empty; the layout then closes up.
const layout = computed<Template>(() => {
	if (!props.single) return props.template;
	const keep = (blocks: Block[]) => blocks.filter((b) => b.type !== 'channels');
	return { main: keep(props.template.main), side: keep(props.template.side) };
});

const selected = computed(() => props.channels.find((c) => c.channelid === props.selectedId) ?? null);
const anyUnlocked = computed(() => props.channels.some((c) => c.access === 'passcode' && c.unlocked));
const channelName = (channel: ViewerChannel) => channel.name || t('Main channel');

// UPinInput with type="number" yields numbers.
const pin = ref<number[]>([]);
watch(
	() => [props.selectedId, props.error],
	() => (pin.value = []),
);

function submit() {
	const passcode = pin.value.join('');
	if (props.preview || props.checking || !selected.value || !/^\d{6}$/.test(passcode)) return;
	emit('unlock', selected.value.channelid, passcode);
}

async function share() {
	if (props.preview) return;
	const url = window.location.href;
	try {
		if (navigator.share) {
			await navigator.share({ title: props.title || document.title, url });
		} else {
			await navigator.clipboard.writeText(url);
			toast.add({ title: t('Link copied'), color: 'success' });
		}
	} catch {
		// The viewer closed the share sheet: nothing to report.
	}
}

// Imprint / terms open as a dialog, as on the former playersite.
const dialog = ref<{ title: string; body: string } | null>(null);

const asset = useAsset();
// Uploaded pictures are stored relative to the app, which may be served from a sub-path.
const picture = (value: string) => (isUploadedImage(value) ? asset(value) : value);

const text = (block: Block, key: string) => String(block.props[key] ?? '');
const on = (block: Block, key: string) => block.props[key] === true;
</script>

<template>
	<div class="relative min-h-full bg-default text-default" :class="preview ? '' : 'min-h-dvh'">
		<template v-if="background">
			<img :src="picture(background)" alt="" class="absolute inset-0 size-full object-cover" />
			<div class="absolute inset-0 bg-default/85" />
		</template>

		<UContainer class="relative grid gap-6 py-6" :class="layout.main.length > 0 && layout.side.length > 0 ? 'lg:grid-cols-[minmax(0,1fr)_20rem]' : ''">
			<div v-for="region in ['main', 'side'] as const" v-show="layout[region].length > 0" :key="region" class="min-w-0 space-y-6">
				<template v-for="block in layout[region]" :key="block.id">
					<header v-if="block.type === 'header'" class="flex items-center justify-between gap-3">
						<div class="flex min-w-0 items-center gap-3">
							<BrandMark v-if="on(block, 'showLogo')" :size="32" />
							<div class="min-w-0">
								<h1 class="truncate text-xl leading-[30px] font-semibold text-highlighted">{{ title || $t('Live') }}</h1>
								<p v-if="text(block, 'subtitle')" class="truncate text-sm text-muted">{{ text(block, 'subtitle') }}</p>
							</div>
						</div>
						<div class="flex shrink-0 items-center gap-1">
							<UColorModeButton v-if="!preview" size="sm" />
							<UButton
								v-if="anyUnlocked"
								size="sm"
								icon="i-lucide-log-out"
								color="neutral"
								variant="ghost"
								:label="$t('Leave')"
								@click="emit('leave')"
							/>
						</div>
					</header>

					<section v-else-if="block.type === 'player'" class="space-y-3">
						<UEmpty v-if="!selected" class="py-16" icon="i-lucide-tv-minimal" :title="$t('No channels are available yet.')" />

						<template v-else-if="selected.unlocked">
							<div v-if="preview" class="flex aspect-video w-full items-center justify-center rounded-lg bg-inverted text-inverted">
								<UIcon name="i-lucide-play" class="size-10" />
							</div>
							<HlsPlayer v-else :key="selected.channelid" :src="selected.manifest" :poster="selected.poster" autoplay />
						</template>

						<div
							v-else
							class="flex aspect-video w-full flex-col items-center justify-center gap-4 rounded-lg border border-default bg-elevated p-6 text-center"
						>
							<UIcon name="i-lucide-lock-keyhole" class="size-8 text-primary" />
							<template v-if="selected.expired">
								<p class="font-semibold text-highlighted">{{ $t('The passcode for this channel has expired.') }}</p>
							</template>
							<form v-else class="flex flex-col items-center gap-4" @submit.prevent="submit">
								<div class="space-y-1">
									<p class="font-semibold text-highlighted">{{ $t('Enter the passcode') }}</p>
									<p class="text-sm text-muted">{{ $t('Enter the 6-digit passcode you were given to watch.') }}</p>
								</div>
								<UPinInput
									v-model="pin"
									:length="6"
									type="number"
									otp
									mask
									size="xl"
									:disabled="checking || preview"
									:aria-label="$t('Passcode')"
									@complete="submit"
								/>
								<p v-if="error" class="text-sm text-error" role="alert">{{ error }}</p>
								<UButton type="submit" :loading="checking" :disabled="preview || pin.join('').length !== 6" :label="$t('Watch')" />
							</form>
						</div>

						<div v-if="selected && (on(block, 'showTitle') || on(block, 'showShare'))" class="flex items-start justify-between gap-3">
							<div class="min-w-0 space-y-1">
								<h2 v-if="on(block, 'showTitle')" class="text-xl leading-[30px] font-semibold text-highlighted">{{ channelName(selected) }}</h2>
								<p v-if="on(block, 'showDescription') && selected.description" class="whitespace-pre-line text-muted">
									{{ selected.description }}
								</p>
							</div>
							<UButton
								v-if="on(block, 'showShare')"
								size="sm"
								color="neutral"
								variant="outline"
								icon="i-lucide-share-2"
								:label="$t('Share')"
								@click="share"
							/>
						</div>
					</section>

					<nav v-else-if="block.type === 'channels'" class="space-y-2" :aria-label="$t('Channels')">
						<h2 class="ph-label text-muted">{{ text(block, 'heading') || $t('Channels') }}</h2>
						<button
							v-for="channel in channels"
							:key="channel.channelid"
							type="button"
							class="flex min-h-11 w-full items-center gap-2 rounded-md border px-3 text-left"
							:class="
								channel.channelid === selectedId
									? 'border-primary bg-elevated font-semibold text-highlighted'
									: 'border-default bg-elevated/50 text-default hover:bg-elevated'
							"
							:aria-current="channel.channelid === selectedId ? 'true' : undefined"
							@click="emit('select', channel.channelid)"
						>
							<UIcon :name="channel.unlocked ? 'i-lucide-tv' : 'i-lucide-lock-keyhole'" class="size-4 shrink-0 text-muted" />
							<span class="min-w-0 flex-1 truncate">{{ channelName(channel) }}</span>
							<span v-if="!channel.unlocked" class="ph-label shrink-0 text-muted">{{ $t('Passcode') }}</span>
						</button>
					</nav>

					<section v-else-if="block.type === 'text'" class="space-y-1">
						<h2 v-if="text(block, 'heading')" class="text-xl leading-[30px] font-semibold text-highlighted">{{ text(block, 'heading') }}</h2>
						<p class="whitespace-pre-line">{{ text(block, 'body') || (preview ? $t('Text') : '') }}</p>
					</section>

					<template v-else-if="block.type === 'image'">
						<component
							:is="text(block, 'link') && !preview ? 'a' : 'div'"
							v-if="text(block, 'url')"
							:href="text(block, 'link') || undefined"
							target="_blank"
							rel="noopener noreferrer"
							class="block"
						>
							<img :src="picture(text(block, 'url'))" :alt="text(block, 'alt')" class="w-full rounded-lg border border-default" />
						</component>
						<div
							v-else-if="preview"
							class="flex h-24 items-center justify-center rounded-lg border border-dashed border-accented text-sm text-muted"
						>
							{{ $t('Image') }}
						</div>
					</template>

					<template v-else-if="block.type === 'button'">
						<UButton
							v-if="text(block, 'label')"
							block
							color="neutral"
							variant="outline"
							trailing-icon="i-lucide-arrow-up-right"
							:label="text(block, 'label')"
							:to="preview ? undefined : text(block, 'url') || undefined"
							target="_blank"
						/>
						<div
							v-else-if="preview"
							class="flex h-11 items-center justify-center rounded-md border border-dashed border-accented text-sm text-muted"
						>
							{{ $t('Button') }}
						</div>
					</template>

					<footer v-else-if="block.type === 'footer'" class="flex flex-wrap gap-x-4 gap-y-1 border-t border-default pt-4 text-sm text-muted">
						<button
							v-if="text(block, 'imprint')"
							type="button"
							class="text-primary underline-offset-2 hover:underline"
							@click="dialog = { title: $t('Imprint'), body: text(block, 'imprint') }"
						>
							{{ $t('Imprint') }}
						</button>
						<button
							v-if="text(block, 'terms')"
							type="button"
							class="text-primary underline-offset-2 hover:underline"
							@click="dialog = { title: $t('Terms'), body: text(block, 'terms') }"
						>
							{{ $t('Terms') }}
						</button>
						<span v-if="preview && !text(block, 'imprint') && !text(block, 'terms')">{{ $t('Footer') }}</span>
					</footer>
				</template>
			</div>
		</UContainer>

		<UModal :open="dialog !== null" :title="dialog?.title" @update:open="(open) => !open && (dialog = null)">
			<template #body>
				<p class="whitespace-pre-line">{{ dialog?.body }}</p>
			</template>
		</UModal>
	</div>
</template>
