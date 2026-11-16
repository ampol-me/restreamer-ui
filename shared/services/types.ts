// Types for the publication services ported from legacy/src/views/Publication/Services/*.js

// One FFmpeg output as handed to the publication process config.
// `options` are FFmpeg command line options. Legacy DASH pushes numbers (0/1) for booleans, hence `string | number`.
export interface ServiceOutput {
	address: string;
	options: (string | number)[];
}

// What the legacy service components read from their props.
export interface ServiceContext {
	// Service skills as produced by conflateServiceSkills(service.requires, skills):
	// { ffmpeg: { version_major, ... }, protocols: string[], formats: string[], codecs: { audio: string[], video: string[] }, devices?: {...} }
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	skills: any;
	// Channel metadata: { name, description, license, ... }
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	metadata: any;
	// The streams of the egress (after encoding): { type: 'video' | 'audio', codec, ... }[]
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	streams: any[];
	// Injectable replacement for uuidv4() (youtube/twitter HLS mode) so tests are deterministic.
	uuid?: () => string;
}

export interface ServiceRequires {
	protocols?: string[];
	formats?: string[];
	codecs?: {
		audio?: string[];
		video?: string[];
	};
	devices?: string[];
}

export interface ServiceAuthor {
	creator: { name: string; link: string };
	maintainer: { name: string; link: string };
}

export type ServiceCategory = 'platform' | 'universal' | 'software';

// Describes the legacy icon; the new UI maps it to whatever icon set it uses.
// - fontawesome-brand / fontawesome-solid: `name` is the legacy import name (e.g. 'faYoutube')
// - mui: `name` is the @mui/icons-material module name (e.g. 'LinkedIn')
// - svg / image: `name` is the legacy file relative to legacy/src/views/Publication/Services (e.g. 'logos/akamai.svg')
export interface ServiceIcon {
	type: 'fontawesome-brand' | 'fontawesome-solid' | 'mui' | 'svg' | 'image';
	name: string;
	color?: string;
	alt?: string;
}

export interface ServiceLink {
	text: string;
	href: string;
}

export interface ServiceFieldOption<S> {
	value: string;
	label: string;
	disabled?: boolean;
	// The option is only offered if this returns true (e.g. depends on the available protocols).
	showIf?: (settings: S, ctx: ServiceContext) => boolean;
}

export interface ServiceField<S> {
	// Path into the settings object. Nested settings use a dotted path, e.g. 'options.hls_time'.
	key: string;
	// 'multiselect' holds a string[] (legacy MultiSelect), 'info' is read-only text without a value.
	type: 'text' | 'password' | 'select' | 'multiselect' | 'checkbox' | 'url' | 'number' | 'textarea' | 'info';
	// English label as in legacy <Trans>. Labels that are FFmpeg option names are not meant to be translated.
	label: string;
	options?: ServiceFieldOption<S>[] | ((settings: S, ctx: ServiceContext) => ServiceFieldOption<S>[]);
	required?: boolean;
	// Rendered read-only/disabled in legacy.
	disabled?: boolean;
	placeholder?: string;
	// number inputs
	min?: string;
	max?: string;
	step?: string;
	// textarea
	rows?: number;
	showIf?: (settings: S, ctx: ServiceContext) => boolean;
	// Helper text below the field. A function returns false if there's nothing to show (legacy helperText).
	help?: string | ((settings: S, ctx: ServiceContext) => string | false);
	// Legacy "GET" button next to the field that opens the page where the stream key can be found.
	link?: { label: string; href: string | ((settings: S) => string); disabled?: (settings: S) => boolean };
	// The field lives in the collapsed "Advanced settings" accordion.
	advanced?: boolean;
	// Heading (legacy <Typography variant="h3">) the field is grouped under.
	section?: string;
}

export interface Service<S = Record<string, unknown>> {
	id: string;
	name: string;
	version: string;
	stream_key_link: string;
	category: ServiceCategory;
	requires: ServiceRequires;
	author: ServiceAuthor;
	// English text of the legacy <Trans> JSX. Links inside the text are listed in description_links.
	description: string;
	description_links?: ServiceLink[];
	image_copyright: string;
	image_copyright_links?: ServiceLink[];
	// Link to the FFmpeg documentation shown at the bottom of the legacy advanced settings.
	documentation?: string;
	icon: ServiceIcon;
	// Set defaults for all settings that are not defined. `metadata` is only used by icecast.
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	init(settings?: Record<string, any>, metadata?: any): S;
	// Create the FFmpeg outputs. Expects settings that went through init().
	// Legacy nimotv yields [null] without a stream key, hence the nullable element type.
	createOutput(settings: S, ctx: ServiceContext): (ServiceOutput | null)[];
	// Only for services whose legacy handleChange did more than assigning/toggling the value (rtmp, datarheicore).
	// Mutates and returns the settings; call it instead of a plain assignment, then call createOutput().
	handleChange?(settings: S, key: string, value: string, ctx: ServiceContext): S;
	fields: ServiceField<S>[];
}
