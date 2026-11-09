import { equipmentCategories } from '../requests/transfer-item-label';
import type { EquipmentOrganization } from '../equipment/equipment-categories';
import type { InventoryItem, InwardOutwardRecord } from '@/lib/types';

type Source = typeof equipmentCategories[number]['source'];
export type InwardDestination = { source: Source; categoryId: string };
type NamedItem = {
  id: string; name?: string; equipmentName?: string; machineName?: string;
  model?: string; make?: string; type?: string; serialNumber?: string;
};
type Catalogue = Record<Source | 'inventoryItems', readonly NamedItem[]>;
type Choice = { name: string; label: string; destination?: InwardDestination };

export function inwardChoices(inventory: Catalogue, organization: EquipmentOrganization) {
  const groups = new Map<string, Map<string, Choice>>();
  function add(value: string | undefined, label: string, destination?: InwardDestination) {
    const name = value?.trim();
    if (!name) return;
    const key = name.toLowerCase();
    const group = groups.get(key) || new Map<string, Choice>();
    group.set(destination?.categoryId || 'store', { name, label, destination });
    groups.set(key, group);
  }
  const categories = [
    ...equipmentCategories,
    ...Object.entries(organization.categories || {}).map(([id, category]) => ({
      id, name: category.name, source: 'otherEquipments' as const,
    })),
  ];
  function addEquipment(name: string | undefined, category: typeof categories[number]) {
    add(name, 'Equipment / ' + category.name, { categoryId: category.id, source: category.source });
  }
  inventory.inventoryItems.forEach(item => add(item.name, 'Store Inventory'));
  categories.forEach(category => addEquipment(category.name, category));
  for (const source of new Set(equipmentCategories.map(category => category.source))) {
    for (const item of inventory[source]) {
      const assigned = organization.assignments?.[source + ':' + item.id];
      const category = categories.find(c => c.id === assigned) || equipmentCategories.find(c =>
        c.source === source && (source !== 'mobileSims' || c.id === (item.type === 'SIM' ? 'sims' : 'mobiles')));
      if (category) addEquipment(item.equipmentName || item.machineName || item.name || item.model || item.make, category);
    }
  }
  return [...groups.values()].flatMap(group => [...group.values()].map(choice => ({
    ...choice, value: group.size === 1 && !choice.destination ? choice.name : choice.name + ' — ' + choice.label,
  }))).sort((a, b) => a.value.localeCompare(b.value, undefined, { numeric: true }));
}

export function resolveInwardChoice(input: string, choices: ReturnType<typeof inwardChoices>) {
  const name = input.trim();
  const key = name.toLowerCase();
  const match = choices.find(choice => choice.value.toLowerCase() === key);
  if (match) return { name: match.name, destination: match.destination };
  const matches = choices.filter(choice => choice.name.toLowerCase() === key);
  if (matches.length === 1) return { name: matches[0].name, destination: matches[0].destination };
  if (matches.length || name.includes(' — Equipment / ')) {
    throw new Error('Choose the destination for "' + name + '" from the Item Name list.');
  }
  return { name, destination: undefined };
}

export function equipmentFields(destination: InwardDestination, name: string, serial: string) {
  switch (destination.source) {
    case 'utMachines':
    case 'dftMachines': return { machineName: name };
    case 'otherEquipments': return { equipmentName: name };
    case 'mobileSims': return destination.categoryId === 'sims'
      ? { type: 'SIM', simNumber: serial } : { type: 'Mobile', model: name, imei: serial };
    case 'digitalCameras':
    case 'weldingMachines':
    case 'walkieTalkies':
    case 'anemometers':
    case 'laptopsDesktops': return { model: name };
    default: return {};
  }
}

export function inwardLinkedItem(record: InwardOutwardRecord, id: string, catalogue: Catalogue) {
  const dest = record.equipmentDestinations?.[id];
  const source = dest && equipmentCategories.find(c => c.source === dest.source)?.source;
  const item = catalogue[source || 'inventoryItems'].find(i => i.id === id);
  return item as (Partial<InventoryItem> & { id: string; name: string; serialNumber: string }) | undefined;
}
