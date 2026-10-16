import type { Vehicle, VehicleUsageRecord } from '@/lib/types';

export type UsageEntry = VehicleUsageRecord[string]['records'][string];

export function usageStatus(record?: UsageEntry) {
  if (record?.isLocked) return { key: 'completed', label: 'Completed' } as const;
  if (Object.values(record?.days || {}).some(day => day.startKm || day.endKm || day.overtime || day.remarks)) {
    return { key: 'ongoing', label: 'On going' } as const;
  }
  return { key: 'notStarted', label: 'Not started' } as const;
}

export function visibleMonthVehicles(vehicles: Vehicle[], records?: Record<string, UsageEntry>) {
  if (!Array.isArray(vehicles)) return [];
  return vehicles.filter(vehicle => records?.[vehicle.id] || vehicle.status === 'Active' || vehicle.status === 'In Maintenance')
    .sort((a, b) => a.vehicleNumber.localeCompare(b.vehicleNumber));
}

export function usageTotals(record: UsageEntry | undefined, month: Date) {
  let km = 0, minutes = 0, hasDistance = false, hasOvertime = false;
  const dayCount = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  for (let day = 1; day <= dayCount; day++) {
    const entry = record?.days?.[day];
    if (!entry) continue;
    const start = Number(entry.startKm || 0), end = Number(entry.endKm || 0);
    if (Number.isFinite(start) && Number.isFinite(end)) {
      if (start || end) hasDistance = true;
      if (end > start) km += end - start;
    }
    const raw = String(entry.overtime ?? '').trim();
    if (raw) {
      const [hours, remainder] = raw.split(':').map(Number);
      const value = raw.includes(':') ? hours * 60 + (remainder || 0) : Number(raw) * 60;
      if (Number.isFinite(value) && value >= 0) { minutes += value; hasOvertime = true; }
    }
  }
  minutes = Math.round(minutes);
  return { km, hasDistance, hasOvertime, overtime: Math.floor(minutes / 60) + ':' + String(minutes % 60).padStart(2, '0') };
}
