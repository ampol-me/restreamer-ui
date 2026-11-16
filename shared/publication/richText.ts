// Service descriptions are plain English text plus the links inside it (Service.description_links). The legacy
// catalogs key the same text with lingui markers around each link ("… found <0>here</0>."), so that is the key to
// look a translation up with, and the format a translation comes back in.
import type { ServiceLink } from '../services/types';

export interface TextSegment {
	text: string;
	href?: string;
}

/** Wraps each link text in the description with its lingui marker: "found here." -> "found <0>here</0>." */
export function markLinks(text: string, links: ServiceLink[] = []): string {
	let out = '';
	let rest = text;

	links.forEach((link, i) => {
		const at = rest.indexOf(link.text);
		if (at === -1) {
			return;
		}

		out += rest.slice(0, at) + `<${i}>${link.text}</${i}>`;
		rest = rest.slice(at + link.text.length);
	});

	return out + rest;
}

/** Splits a text with lingui markers into plain and linked segments. A marker without a link stays plain text. */
export function splitMarked(marked: string, links: ServiceLink[] = []): TextSegment[] {
	const segments: TextSegment[] = [];
	const marker = /<(\d+)>(.*?)<\/\1>/g;
	let last = 0;

	for (const match of marked.matchAll(marker)) {
		if (match.index > last) {
			segments.push({ text: marked.slice(last, match.index) });
		}

		const link = links[Number(match[1])];
		segments.push(link ? { text: match[2] ?? '', href: link.href } : { text: match[2] ?? '' });
		last = match.index + match[0].length;
	}

	if (last < marked.length) {
		segments.push({ text: marked.slice(last) });
	}

	return segments;
}
