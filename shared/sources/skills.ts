// The network source extends `skills.protocols.input` in place (initSkills adds rtsp/rtsps, as legacy does).

/** A copy of the skills that may be handed to the network source without it writing into the caller's skills. */
export function detachSkills<T>(skills: T): T {
	if (!skills || typeof skills !== 'object') {
		return skills;
	}

	const protocols = (skills as { protocols?: { input?: unknown } }).protocols;
	if (!protocols || !Array.isArray(protocols.input)) {
		return { ...skills };
	}

	return { ...skills, protocols: { ...protocols, input: [...protocols.input] } };
}
