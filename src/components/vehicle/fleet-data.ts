import { addDays, differenceInCalendarDays, format, isValid, parseISO, startOfDay } from 'date-fns';
import type { Vehicle, Driver } from '@/lib/types';
export const vehicleDocuments = [
  ['vapValidity', 'VAP'], ['insuranceValidity', 'Insurance'], ['fitnessValidity', 'Fitness'], ['taxValidity', 'Tax'], ['puccValidity', 'PUCC'],
] as const;
export const driverDocuments = [
  ['licenseExpiry', 'License'], ['epExpiry', 'EP'], ['medicalExpiry', 'Medical'], ['safetyExpiry', 'Safety'],
] as const;
export function expiryInfo(value?: string, now = new Date()) {
  const date = value ? parseISO(value) : null;
  if (!date || !isValid(date)) return { label: value ? 'Invalid date' : 'Not entered', tone: 'neutral', days: null, date: null };
  const days = differenceInCalendarDays(date, now);
  return { label: format(date, 'dd MMM yyyy'), tone: days < 0 ? 'expired' : days <= 30 ? 'soon' : 'valid', days, date };
}
export type DueDocument = {
  id: string; type: 'Vehicle' | 'Driver'; owner: string; document: string; expiry: string;
  vehicle?: Vehicle; driver?: Driver;
};
export function dueDocuments(vehicles: Vehicle[], drivers: Driver[], now = new Date()): DueDocument[] {
  const rows: DueDocument[] = [];
  for (const vehicle of vehicles) {
    if (vehicle.status !== 'Active' && vehicle.status !== 'In Maintenance') continue;
    for (const [key, document] of vehicleDocuments) {
      const expiry = vehicle[key], info = expiryInfo(expiry, now);
      if (expiry && info.date && info.date < addDays(startOfDay(now), 31)) rows.push({ id: 'vehicle-' + vehicle.id + '-' + key, type: 'Vehicle', owner: vehicle.vehicleNumber, document, expiry, vehicle });
    }
  }
  for (const driver of drivers) {
    for (const [key, document] of driverDocuments) {
      const expiry = driver[key], info = expiryInfo(expiry, now);
      if (expiry && info.date && info.date < addDays(startOfDay(now), 31)) rows.push({ id: 'driver-' + driver.id + '-' + key, type: 'Driver', owner: driver.name, document, expiry, driver });
    }
  }
  return rows.sort((a, b) => a.expiry.localeCompare(b.expiry) || a.owner.localeCompare(b.owner));
}
export function reportGroups(rows: DueDocument[]) {
  const vehicles = new Map<string, {vehicle: Vehicle; expiringDocs: string[]}>();
  const drivers = new Map<string, {driver: Driver; expiringDocs: string[]}>();
  for (const row of rows) {
    const description = row.document + ' on ' + format(parseISO(row.expiry), 'dd-MM-yyyy');
    if (row.vehicle) {
      const item = vehicles.get(row.vehicle.id) || {vehicle: row.vehicle, expiringDocs: []};
      item.expiringDocs.push(description); vehicles.set(row.vehicle.id, item);
    }
    if (row.driver) {
      const item = drivers.get(row.driver.id) || {driver: row.driver, expiringDocs: []};
      item.expiringDocs.push(description); drivers.set(row.driver.id, item);
    }
  }
  return {expiringVehicles: [...vehicles.values()], expiringDrivers: [...drivers.values()]};
}
