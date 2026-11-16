// Ported from legacy/src/version.js, then maintained by hand.
//
// Legacy derived these from legacy/package.json (`version` and `bundle`). The root package.json
// of the Nuxt app carries a different version and no `bundle`, so the legacy values are pinned
// here to keep the port's output (e.g. the `version` written into metadata) identical to legacy.
const pkg = {
	name: 'restreamer-ui',
	version: '1.14.0',
	bundle: 'restreamer-v2.12.0',
};

const Core = '^16.11.0';
const FFmpeg = '^5.1.0 || ^6.1.0';
const UI = pkg.bundle ? pkg.bundle : pkg.name + ' v' + pkg.version;
const Version = pkg.version;

export { Core, FFmpeg, UI, Version };
