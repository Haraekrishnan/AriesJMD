/** Display wording only: keep persisted status values compatible with logs and filters. */
export function equipmentStatusLabel(status: string | null | undefined): string {
 return status === 'In Service' ? 'In use' : status || '—';
}
