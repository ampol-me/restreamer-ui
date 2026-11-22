import { feedTarget } from '../../../../shared/studio/feed';
import { QUALITIES, isQuality } from '../../../../shared/studio/setup';
import { isChannelId } from '../../../utils/viewer/paths';

// Admin: put a channel on air from the Studio. Answers with the id the recording is posted to.
export default defineEventHandler(async (event) => {
	const { core, config } = await requireCoreConfig(event);

	const body = await readBody<{ channelid?: unknown; quality?: unknown }>(event);
	if (!isChannelId(body?.channelid) || !isQuality(body.quality)) {
		throw createError({ statusCode: 400, statusMessage: 'The channel or the quality is not valid.' });
	}

	const target = feedTarget(core, config, body.channelid);
	if (target === null) {
		throw createError({ statusCode: 409, statusMessage: 'The RTMP server of the core is switched off.', data: { reason: 'no-rtmp' } });
	}

	try {
		return { id: await studioFeeds(event).start(body.channelid, target, QUALITIES[body.quality]) };
	} catch (e: unknown) {
		throw feedHttpError(e);
	}
});
