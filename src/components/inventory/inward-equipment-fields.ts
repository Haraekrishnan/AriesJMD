import { equipmentCategories } from '../requests/transfer-item-label';
import type { InwardDestination } from './inward-item-names';

const labels = {
  make: 'Make', model: 'Model', machineName: 'Machine name', equipmentName: 'Equipment name',
  unit: 'Unit', calibrationDueDate: 'Calibration due date', tpInspectionDueDate: 'TP inspection due date',
  probeDetails: 'Probe details', probeStatus: 'Probe status', cableDetails: 'Cable details', cableStatus: 'Cable status',
  certificateUrl: 'Certificate URL', status: 'Status', allottedTo: 'Allotted to', password: 'Device password',
  allottedToUserId: 'Allotted to', allotmentDate: 'Allotment date', simProvider: 'SIM provider', category: 'Category',
} as const;
export type EquipmentField = keyof typeof labels;
export { labels };

export function fieldsFor(destination: InwardDestination): EquipmentField[] {
  switch (destination.source) {
    case 'digitalCameras':
    case 'walkieTalkies': return ['make', 'model', 'status'];
    case 'weldingMachines': return ['make', 'model', 'status', 'tpInspectionDueDate', 'certificateUrl'];
    case 'anemometers': return ['make', 'model', 'status', 'calibrationDueDate'];
    case 'utMachines':
    case 'dftMachines': return ['machineName', 'unit', 'calibrationDueDate', 'tpInspectionDueDate', 'probeDetails', 'probeStatus', 'cableDetails', 'cableStatus', 'status', 'certificateUrl'];
    case 'otherEquipments': return ['equipmentName', 'category', 'tpInspectionDueDate', 'certificateUrl'];
    case 'laptopsDesktops': return ['make', 'model', 'allottedTo', 'password'];
    case 'mobileSims': return [...(destination.categoryId === 'sims' ? ['simProvider'] as const : ['make', 'model'] as const), 'allottedToUserId', 'allotmentDate', 'status'];
    default: return ['status'];
  }
}

export function readEquipmentFields(destination: InwardDestination, item: object): Record<string, string> {
  const values: Record<string, string> = {};
  for (const key of fieldsFor(destination)) {
    const value = Reflect.get(item, key);
    if (key === 'model' && value === Reflect.get(item, 'name') && equipmentCategories.some(c => c.source === destination.source && c.name === value)) continue;
    if (typeof value === 'string') values[key] = key.endsWith('Date') ? value.slice(0, 10) : value;
  }
  return values;
}

export function requiredEquipmentFields(destination: InwardDestination): EquipmentField[] {
  switch (destination.source) {
    case 'digitalCameras':
    case 'anemometers':
    case 'laptopsDesktops': return ['make', 'model'];
    case 'utMachines': return ['machineName', 'unit', 'calibrationDueDate'];
    case 'dftMachines': return ['machineName', 'unit', 'calibrationDueDate', 'probeDetails', 'cableDetails'];
    case 'otherEquipments': return ['equipmentName'];
    case 'mobileSims': return destination.categoryId === 'sims' ? ['simProvider'] : ['make', 'model'];
    default: return [];
  }
}

export function equipmentPayload(destination: InwardDestination, values: Record<string, string> = {}, serial: string, creating = false) {
  if (creating) {
    const missing = requiredEquipmentFields(destination).filter(key => !values[key]?.trim());
    if (missing.length) throw new Error(serial + ": enter " + missing.map(key => labels[key]).join(", ") + ".");
  }
  const result: Record<string, string | null> = {};
  for (const key of fieldsFor(destination)) {
    if (key in values) result[key] = values[key] || null;
  }
  if (destination.source === 'mobileSims') {
    const sim = destination.categoryId === 'sims';
    result[sim ? 'simNumber' : 'imei'] = serial;
  }
  return result;
}
