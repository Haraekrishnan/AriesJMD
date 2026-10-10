export function newestComparisonsFirst<T extends { createdAt?: string; id: string }>(items: readonly T[]): T[] {
  const timestamp = (value?: string) => { const n = Date.parse(value || ''); return Number.isFinite(n) ? n : -Infinity; };
  return [...items].sort((a, b) => {
    const at = timestamp(a.createdAt), bt = timestamp(b.createdAt);
    return at === bt ? a.id.localeCompare(b.id) : at > bt ? -1 : 1;
  });
}
