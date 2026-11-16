import { readSessionToken } from '../../utils/portal/session';

// Public: what the passcode screen needs to know.
export default defineEventHandler(async (event) => {
	const config = await getPortalConfig();
	const enabled = config.enabled && config.passcode !== null;

	const authenticated = enabled && readSessionToken(getCookie(event, PORTAL_COOKIE), await getPortalSecret(), Date.now(), config.revision) !== null;

	return { enabled, title: enabled ? config.title : '', authenticated };
});
