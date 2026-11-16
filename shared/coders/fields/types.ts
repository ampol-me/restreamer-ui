// Declarative description of a coder's or filter's settings form. The legacy UI built these
// forms in JSX inside every coder module; here they are data, rendered by
// app/components/coder/SettingsForm.vue.

export interface SettingOption {
	value: string;
	label: string;
}

export interface SettingsContext {
	// The input stream the coder works on (MetadataStream), if any.
	stream: unknown;
	// The core's skills object.
	skills: any;
}

export interface SettingField {
	// Key in the coder's settings object. A `note` has no value and an empty key.
	key: string;
	// `note` is a warning shown inside the form (label, optionally a second sentence in `help`).
	type: 'select' | 'text' | 'number' | 'checkbox' | 'textarea' | 'note';
	// English, as in the legacy <Trans>; doubles as the translation key.
	label: string;
	options?: SettingOption[];
	// Select that also accepts a typed value (legacy SelectCustom).
	allowCustom?: boolean;
	customLabel?: string;
	help?: string;
	// Width in a 12 column grid from the `md` breakpoint up (legacy Grid), default 12.
	cols?: 4 | 6 | 8 | 12;
	// Limits of a `number` field.
	min?: number;
	max?: number;
	showIf?: (settings: Record<string, unknown>, ctx: SettingsContext) => boolean;
	disabledIf?: (settings: Record<string, unknown>, ctx: SettingsContext) => boolean;
	// Other settings that follow from this field's new value (merged into the settings).
	derive?: (value: unknown, settings: Record<string, unknown>) => Record<string, unknown>;
}
