import { describe, expect, test } from 'bun:test';

import { MAX_IMAGE_CHARS, MAX_SCENES, applyScene, captureScene, defaultSetup, isImageData, sanitizeSetup, setupKey } from './setup';

const png = 'data:image/png;base64,iVBORw0KGgo=';

describe('stored Studio setup', () => {
	test('nothing stored gives the defaults', () => {
		expect(sanitizeSetup(null)).toEqual(defaultSetup());
		expect(sanitizeSetup('nonsense')).toEqual(defaultSetup());
		expect(sanitizeSetup([])).toEqual(defaultSetup());
	});

	test('a complete setup survives unchanged', () => {
		const setup = {
			...defaultSetup(),
			layout: 'pip' as const,
			quality: '1080p' as const,
			logo: { show: true, image: png, corner: 'bottom-left' as const, size: 20 },
			lowerThird: { show: true, name: 'Ampol', title: 'Host' },
			banner: { show: true, text: 'Welcome', ticker: true },
			background: 'data:image/jpeg;base64,/9j/4AAQ',
			scenes: [
				{
					id: 'a',
					name: 'Opening',
					layout: 'solo' as const,
					stage: ['camera:1'],
					logo: true,
					lowerThird: { show: false, name: '', title: '' },
					banner: { show: false, text: '', ticker: false },
				},
			],
		};
		expect(sanitizeSetup(JSON.parse(JSON.stringify(setup)))).toEqual(setup);
	});

	test('unknown values fall back, numbers are kept in range, texts are cut', () => {
		const setup = sanitizeSetup({
			layout: 'cube',
			quality: '4k',
			logo: { show: 'yes', image: 'https://example.com/logo.png', corner: 'middle', size: 500 },
			lowerThird: { show: true, name: 'x'.repeat(500), title: 7 },
			banner: { text: 'y'.repeat(500) },
		});
		expect(setup.layout).toBe('solo');
		expect(setup.quality).toBe('720p');
		expect(setup.logo).toEqual({ show: false, image: '', corner: 'top-right', size: 30 });
		expect(setup.lowerThird.name).toHaveLength(120);
		expect(setup.lowerThird.title).toBe('');
		expect(setup.banner.text).toHaveLength(300);
	});

	test('only embedded pictures of a known type and a bearable size are kept', () => {
		expect(isImageData(png)).toBe(true);
		expect(isImageData('data:image/svg+xml;base64,PHN2Zz4=')).toBe(false);
		expect(isImageData('data:text/html;base64,PGI+')).toBe(false);
		expect(isImageData('javascript:alert(1)')).toBe(false);
		expect(isImageData('data:image/png;base64,' + 'A'.repeat(MAX_IMAGE_CHARS))).toBe(false);
	});

	test('scenes without id or name, doubles and the surplus are dropped', () => {
		const scene = (id: string, name = 'Scene') => ({ id, name, layout: 'grid', stage: ['a', 5, 'b'] });
		const setup = sanitizeSetup({
			scenes: [scene('1'), scene('1'), scene('', 'x'), scene('2', '  '), 'junk', ...Array.from({ length: 20 }, (_, i) => scene(`n${i}`))],
		});
		expect(setup.scenes).toHaveLength(MAX_SCENES);
		expect(setup.scenes[0]).toMatchObject({ id: '1', layout: 'grid', stage: ['a', 'b'], logo: false });
		expect(setup.scenes[1]!.id).toBe('n0');
	});

	test('the setup is kept per channel', () => {
		expect(setupKey('abc')).not.toBe(setupKey('abd'));
	});
});

describe('scenes', () => {
	const current = { ...defaultSetup(), layout: 'split' as const, logo: { show: true, image: png, corner: 'top-left' as const, size: 10 } };

	test('a scene holds the layout, the stage and what the graphics show', () => {
		const setup = { ...current, lowerThird: { show: true, name: 'A', title: 'B' }, banner: { show: true, text: 'T', ticker: true } };
		const stage = ['camera:1', 'screen:2'];
		const scene = captureScene(setup, stage, 'id', '  Interview  ');
		expect(scene).toEqual({
			id: 'id',
			name: 'Interview',
			layout: 'split',
			stage: ['camera:1', 'screen:2'],
			logo: true,
			lowerThird: { show: true, name: 'A', title: 'B' },
			banner: { show: true, text: 'T', ticker: true },
		});
		stage.push('later');
		expect(scene.stage).toHaveLength(2);
	});

	test('switching to a scene brings back its look and those of its sources that are still there', () => {
		const scene = captureScene(
			{ ...current, layout: 'pip', banner: { show: true, text: 'Break', ticker: false } },
			['screen:2', 'camera:1'],
			'id',
			'Break',
		);
		const next = applyScene({ ...current, logo: { ...current.logo, show: false } }, scene, ['camera:9'], ['camera:1', 'camera:9']);
		expect(next.stage).toEqual(['camera:1']);
		expect(next.setup.layout).toBe('pip');
		expect(next.setup.banner).toEqual({ show: true, text: 'Break', ticker: false });
		// The logo's picture, corner and size are the Studio's; the scene only says whether it shows.
		expect(next.setup.logo).toEqual({ ...current.logo, show: true });
	});

	test('a scene whose sources are all gone leaves the stage alone', () => {
		const scene = captureScene(current, ['camera:1'], 'id', 'Gone');
		expect(applyScene(current, scene, ['camera:9'], ['camera:9']).stage).toEqual(['camera:9']);
	});
});
