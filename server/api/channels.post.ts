import { addChannel } from './_storage';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);

  if (!body || typeof body.name !== 'string' || !body.name.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Channel name is required' });
  }

  const channel = addChannel({
    name: body.name.trim(),
    source: typeof body.source === 'string' ? body.source : '',
    profile: typeof body.profile === 'string' ? body.profile : 'custom',
    autoStart: Boolean(body.autoStart),
    bitrate: typeof body.bitrate === 'number' ? body.bitrate : undefined,
  });

  return channel;
});
