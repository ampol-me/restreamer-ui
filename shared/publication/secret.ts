// Stream keys, tokens and passwords of a publication are masked on screen until the user asks to
// see them: these pages are open while people share their screen. The service definitions (ported
// from legacy) mark only a few of them as passwords, so the field's key decides as well.
const SECRET_KEY = /(^|[._])(stream_?key|key|token|password|passphrase|secret)(_(primary|backup))?$/i;

export function isSecretField(field: { key: string; type: string }): boolean {
	return field.type === 'password' || (field.type === 'text' && SECRET_KEY.test(field.key));
}
