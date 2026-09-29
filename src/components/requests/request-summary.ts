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
