import { addPublication } from './_storage';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);

  if (!body || typeof body.name !== 'string' || !body.name.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Publication name is required' });
  }

  if (typeof body.destination !== 'string' || !body.destination.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Destination is required' });
  }

  const publication = addPublication({
    name: body.name.trim(),
    destination: body.destination.trim(),
    channelId: typeof body.channelId === 'string' ? body.channelId : undefined,
    autoStart: Boolean(body.autoStart),
  });

  return publication;
});
