// Form of the AV1 NVENC encoder (no legacy counterpart). av1_nvenc only knows the main profile.
import { nvencFields } from './nvenc';

export const fields = nvencFields(['main']);
