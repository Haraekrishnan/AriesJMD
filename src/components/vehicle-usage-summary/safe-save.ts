export function usageSnapshot(value: any): string {
  const normalize = (input: any): any => {
    if (!input || typeof input !== 'object') return input;
    return Object.fromEntries(Object.keys(input).sort().filter(key => key !== '_previousVersion' && input[key] !== null && input[key] !== undefined).map(key => [key, normalize(input[key])]));
  };
  return JSON.stringify(normalize(value || null));
}

export function prepareUsageSave(current: any, expected: string, draft: any, userId: string, now: string) {
  if (current?.isLocked) throw new Error('This vehicle log was locked. Reopen it after an administrator unlocks it.');
  if (usageSnapshot(current) !== expected) throw new Error('This log changed after you opened it. Your entries have not been saved. Copy your changes before reopening the log.');
  const hasReadings = (record: any) => Object.values(record?.days || {}).some((day: any) => day && (day.startKm || day.endKm || day.overtime || day.remarks));
  if (hasReadings(current) && !hasReadings(draft)) throw new Error('Saving an empty sheet over existing usage data is blocked.');
  const { _previousVersion, ...previous } = current || {};
  return { ...previous, ...draft, lastUpdated: now, lastUpdatedById: userId,
    ...(current ? { _previousVersion: previous } : {}) };
}
