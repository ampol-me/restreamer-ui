// Component defaults that implement the Phila design system on top of Nuxt UI.
// Colours come from the tokens in assets/css/main.css.
const goldAction =
	'bg-(--phila-gold) text-(--on-gold) hover:bg-(--phila-gold)/85 active:bg-(--phila-gold)/85 disabled:bg-(--phila-gold) aria-disabled:bg-(--phila-gold)';

export default defineAppConfig({
	brand: {
		// Product names are "Phila" followed by the name.
		name: 'Phila Restream',
		product: 'Restream',
		website: 'https://www.phila.in.th',
	},
	ui: {
		colors: {
			// Only the names Nuxt UI needs; the actual values are the tokens (main.css).
			primary: 'blue',
			secondary: 'amber',
			neutral: 'slate',
		},
		button: {
			slots: {
				// radius-md: buttons share the rounded corner of the logo's play triangle
				base: 'rounded-lg font-semibold',
			},
			compoundVariants: [
				// The primary action is gold with on-gold text: never white on gold.
				{ color: 'primary', variant: 'solid', class: goldAction },
			],
		},
		input: { slots: { base: 'rounded-sm' } },
		textarea: { slots: { base: 'rounded-sm' } },
		select: { slots: { base: 'rounded-sm' } },
		selectMenu: { slots: { base: 'rounded-sm' } },
		pinInput: { slots: { base: 'rounded-sm' } },
		badge: { slots: { base: 'rounded-sm' } },
		tabs: {
			// The selected tab is an ink pill; gold stays with the primary action.
			defaultVariants: { color: 'neutral' },
		},
	},
});
