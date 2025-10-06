import { z } from 'zod';

import { addChannel } from './_storage';

const schema = z.object({
  name: z.string().min(1),
  source: z.string().min(1),
  profile: z.string().min(1),
  autoStart: z.boolean().optional(),
});

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const parsed = schema.parse(body);

  return addChannel({
    name: parsed.name,
    // store extra info if needed later
    status: 'running',
    bitrate: 0,
    updatedAt: new Date().toISOString(),
  } as any);
});
