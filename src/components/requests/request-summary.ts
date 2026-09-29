import { approvalPendingFirst } from './approval-priority';
/** Shared by the category totals and paginated registers after user visibility filtering. */
export function summarizeRequests<T extends {status: string; items?: readonly {status?: string}[]}>(requests: readonly T[]) {
  const active: T[] = [];
  const completed: T[] = [];
  requests.forEach(request => {
    (request.status === 'Issued' || request.status === 'Rejected' ? completed : active).push(request);
  });
  return {activeRequests: approvalPendingFirst(active), completedRequests: completed, total: requests.length, active: active.length, completed: completed.length};
}

/** One visibility policy for cards, registers and navigation, including custom roles. */
export function visibleRequests<T extends {id: string; requesterId: string; date: string}>(requests: readonly T[], userId: string | undefined, canViewAll: boolean, excludedId?: string): T[] {
  if (!userId) return [];
  return requests.filter(r => r.id !== excludedId && (canViewAll || r.requesterId === userId))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
export function myRequestLists<P extends {id: string; requesterId: string; date: string; status: string}, I extends {id: string; requesterId: string; date: string; status: string; items?: readonly {inventoryItemId?: string | null; status?: string}[]}>(
  ppe: readonly P[], internal: readonly I[], userId: string | undefined,
  permissions: {view_ppe_requests?: boolean; manage_ppe_request?: boolean; view_internal_store_request?: boolean; manage_store_requests?: boolean},
) {
  const ppeRequests = visibleRequests(ppe, userId, !!(permissions.view_ppe_requests || permissions.manage_ppe_request));
  const internalRequests = visibleRequests(internal, userId, !!(permissions.view_internal_store_request || permissions.manage_store_requests), '-OaA1ma81MdDVw62D8Xg');
  return {ppeRequests, internalRequests, activeCount: summarizeRequests(ppeRequests).active + summarizeRequests(internalRequests).active};
}

