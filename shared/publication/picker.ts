// How the "add publication" page offers the services: the few most people want first, the rest
// grouped and searchable.
import type { ServiceCategory } from '../services/types';

/** Shown first, in this order. */
export const popularServices = ['youtube', 'facebook', 'twitch', 'instagram', 'rtmp', 'srt'];

export const categoryOrder: ServiceCategory[] = ['platform', 'software', 'universal'];

interface Listed {
	id: string;
	name: string;
	category: ServiceCategory;
}

/** Case-insensitive match on the name or id; an empty query matches everything. */
export function matchesQuery(service: Pick<Listed, 'id' | 'name'>, query: string): boolean {
	const q = query.trim().toLowerCase();
	return q === '' || service.name.toLowerCase().includes(q) || service.id.toLowerCase().includes(q);
}

/** The popular services that exist, in their fixed order. */
export function popular<T extends Listed>(services: T[]): T[] {
	return popularServices.flatMap((id) => services.filter((s) => s.id === id));
}

/** Services matching the query, per category in the fixed category order, by name; empty groups are left out. */
export function grouped<T extends Listed>(services: T[], query: string): { category: ServiceCategory; services: T[] }[] {
	return categoryOrder
		.map((category) => ({
			category,
			services: services.filter((s) => s.category === category && matchesQuery(s, query)).sort((a, b) => a.name.localeCompare(b.name)),
		}))
		.filter((group) => group.services.length > 0);
}
