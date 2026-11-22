import { adminPassValid, decideDirect } from '../../utils/viewer/direct';

// Reverse proxy (auth_request): may this direct request to the core be passed on?
// Answers with the status only: 204 = yes, 403 = no.
export default defineEventHandler(async (event) => {
	const uri = getHeader(event, 'x-original-uri') ?? '';
	const config = await getViewerConfig();
	const isAdmin = adminPassValid(getCookie(event, VIEWER_ADMIN_COOKIE), await getViewerSecret(), Date.now());

	setResponseStatus(event, uri !== '' && decideDirect(uri, config.channels, isAdmin) ? 204 : 403);
	return null;
});
