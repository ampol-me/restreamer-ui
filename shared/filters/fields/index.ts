// Settings forms of the filters, looked up by the filter name used in the registry (shared/filters).
import type { SettingField } from '../../coders/fields/types';

import { fields as Loudnorm } from './audio/Loudnorm';
import { fields as Pan } from './audio/Pan';
import { fields as AResample } from './audio/Resample';
import { fields as Volume } from './audio/Volume';

import { fields as Bwdif } from './video/Bwdif';
import { fields as Framerate } from './video/Framerate';
import { fields as HFlip } from './video/HFlip';
import { fields as Scale } from './video/Scale';
import { fields as Transpose } from './video/Transpose';
import { fields as VFlip } from './video/VFlip';

export type FilterType = 'video' | 'audio';

const filters: Record<FilterType, Record<string, SettingField[]>> = {
	audio: {
		aresample: AResample,
		pan: Pan,
		volume: Volume,
		loudnorm: Loudnorm,
	},
	video: {
		bwdif: Bwdif,
		fps: Framerate,
		scale: Scale,
		transpose: Transpose,
		hflip: HFlip,
		vflip: VFlip,
	},
};

/** True when the filter is known here. */
export function hasFilterFields(type: FilterType, filter: string): boolean {
	return Object.hasOwn(filters[type] ?? {}, filter);
}

export function getFilterFields(type: FilterType, filter: string): SettingField[] {
	return hasFilterFields(type, filter) ? filters[type][filter]! : [];
}
