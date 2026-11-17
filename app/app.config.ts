// Component defaults that implement the Phila design system on top of Nuxt UI.
// Colours come from the tokens in assets/css/main.css.
// Rules: design/phila/PHILA-DESIGN.md.
const goldAction = 'bg-phila-gold text-on-gold hover:bg-phila-gold/85 active:bg-phila-gold/85 disabled:bg-phila-gold aria-disabled:bg-phila-gold';

// Controls are 44px high by default (touch target); `sm` and `xs` are the 32px size for dense toolbars.
const control = { md: { base: 'min-h-11' }, sm: { base: 'min-h-8' }, xs: { base: 'min-h-8' } };

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
				base: 'rounded-md font-semibold',
			},
			variants: {
				size: {
					md: { base: 'min-h-11 px-4 text-[15px]/[22px]' },
					lg: { base: 'min-h-11' },
					xl: { base: 'min-h-11' },
					sm: { base: 'min-h-8 rounded-sm' },
					xs: { base: 'min-h-8 rounded-sm' },
				},
			},
			compoundVariants: [
				// The primary action is gold with on-gold text: never white on gold.
				{ color: 'primary', variant: 'solid', class: goldAction },
			],
		},
		input: { slots: { base: 'rounded-sm' }, variants: { size: control } },
		textarea: { slots: { base: 'rounded-sm' } },
		select: { slots: { base: 'rounded-sm' }, variants: { size: control } },
		selectMenu: { slots: { base: 'rounded-sm' }, variants: { size: control } },
		pinInput: { slots: { base: 'rounded-sm' } },
		badge: { slots: { base: 'rounded-sm' } },
		tabs: {
			// The selected tab is an ink pill; gold stays with the primary action.
			defaultVariants: { color: 'neutral' },
		},
	},
});
