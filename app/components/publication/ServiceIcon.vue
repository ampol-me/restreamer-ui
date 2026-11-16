<script setup lang="ts">
import type { ServiceIcon } from '#shared/services/types';

// Renders the icon a publication service declares. The legacy UI used FontAwesome, MUI icons and
// logo files; brands map to simple-icons, the generic ones to lucide, logo files live in public/services.
const props = defineProps<{ icon: ServiceIcon }>();

const icons: Record<string, string> = {
	'fontawesome-brand:faFacebook': 'i-simple-icons-facebook',
	'fontawesome-brand:faInstagram': 'i-simple-icons-instagram',
	'fontawesome-brand:faTwitch': 'i-simple-icons-twitch',
	'fontawesome-brand:faTwitter': 'i-simple-icons-twitter',
	'fontawesome-brand:faVimeoV': 'i-simple-icons-vimeo',
	'fontawesome-brand:faYoutube': 'i-simple-icons-youtube',
	'fontawesome-solid:faTools': 'i-lucide-wrench',
	'fontawesome-solid:faImages': 'i-lucide-images',
	'mui:Extension': 'i-lucide-puzzle',
	'mui:LinkedIn': 'i-simple-icons-linkedin',
};

const isFile = computed(() => props.icon.type === 'svg' || props.icon.type === 'image');
// 'logos/akamai.svg' -> '/services/akamai.svg'
const src = computed(() => `/services/${props.icon.name.split('/').pop()}`);
const name = computed(() => icons[`${props.icon.type}:${props.icon.name}`] ?? 'i-lucide-radio-tower');

// Legacy drew on a dark surface, where a white icon was visible. Here it follows the text colour instead.
const color = computed(() => (props.icon.color && props.icon.color.toUpperCase() !== '#FFFFFF' ? props.icon.color : undefined));
</script>

<template>
	<img v-if="isFile" :src="src" :alt="icon.alt ?? ''" class="object-contain" />
	<UIcon v-else :name="name" :style="color ? { color } : undefined" />
</template>
