// The form shared by the audio encoders whose only setting is the bitrate
// (aac, aac_audiotoolbox, mp3_libmp3lame, opus_libopus, vorbis, vorbis_libvorbis).
import { Audio } from '../../common';
import type { SettingField } from '../../types';

export const fields: SettingField[] = [Audio.Bitrate({ allowCustom: true })];
