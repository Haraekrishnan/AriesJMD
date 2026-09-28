/** Keep approval work ahead of fulfilment work, preserving the existing order within each group. */
export function approvalPendingFirst<T extends { status: string; items?: readonly { status?: string }[] }>(requests: readonly T[]): T[] {
  const pending: T[] = [];
  const remaining: T[] = [];
  requests.forEach(request => {
    const needsApproval = request.status === 'Pending' || request.items?.some(item => item.status === 'Pending');
    (needsApproval ? pending : remaining).push(request);
  });
  return [...pending, ...remaining];
}
