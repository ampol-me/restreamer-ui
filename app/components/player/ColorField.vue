<script setup lang="ts">
import { formatRgba, hexToRGBA, parseColor, toHex } from '#shared/player/color';

// A colour as a CSS rgba() string: typed in directly, or picked (hue/saturation plus opacity) from
// the swatch. Replaces legacy misc/ColorPicker.js.
defineProps<{ label: string }>();
const model = defineModel<string>({ required: true });

// Hex values from older settings are shown (and from then on edited) as rgba(), like the legacy field.
const text = computed(() => hexToRGBA(model.value ?? ''));
const color = computed(() => parseColor(text.value));

const picked = computed({
	get: () => (color.value ? toHex(color.value) : '#ffffff'),
	set: (hex: string | undefined) => {
		const next = hex ? parseColor(hex) : null;
		if (next) model.value = formatRgba({ ...next, a: color.value?.a ?? 1 });
	},
});

const opacity = computed({
	get: () => Math.round((color.value?.a ?? 1) * 100),
	set: (percent: number | undefined) => {
		model.value = formatRgba({ ...(color.value ?? { r: 255, g: 255, b: 255 }), a: (percent ?? 100) / 100 });
	},
});
</script>

<template>
	<UFormField :label="label">
		<UInput v-model="model" class="w-full font-mono" :ui="{ trailing: 'pe-1.5' }">
			<template #trailing>
				<UPopover>
					<UButton color="neutral" variant="ghost" size="xs" square :aria-label="label">
						<span class="size-5 rounded-sm ring ring-accented" :style="{ backgroundColor: text }" />
					</UButton>

					<template #content>
						<div class="space-y-3 p-3">
							<UColorPicker v-model="picked" format="hex" />
							<UFormField :label="`${opacity} %`" size="xs">
								<USlider v-model="opacity" :min="0" :max="100" :step="1" size="sm" />
							</UFormField>
						</div>
					</template>
				</UPopover>
			</template>
		</UInput>
	</UFormField>
</template>
