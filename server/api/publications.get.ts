import { getStore } from './_storage';

export default defineEventHandler(() => {
  return getStore().publications;
});
