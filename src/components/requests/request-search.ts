/** Match every word, ignoring case and repeated whitespace. */
export function matchesRequestSearch(query: string, values: readonly unknown[]): boolean {
 const words = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
 const text = values.filter(v => v != null).join(' ').toLocaleLowerCase();
 return words.every(word => text.includes(word));
}
