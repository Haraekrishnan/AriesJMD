import { equipmentCategories } from '../requests/transfer-item-label';
import type { EquipmentOrganization } from '../equipment/equipment-categories';

type NamedItem = {
  id: string;
  name?: string;
  equipmentName?: string;
  machineName?: string;
  model?: string;
  make?: string;
};

type Catalogue = Record<typeof equipmentCategories[number]['source'] | 'inventoryItems', readonly NamedItem[]>;

export function inwardItemNames(inventory: Catalogue, organization: EquipmentOrganization): string[] {
  const names = new Map<string, string>();
  function add(value?: string) {
    const name = value?.trim();
    if (name && !names.has(name.toLowerCase())) names.set(name.toLowerCase(), name);
  }

  inventory.inventoryItems.forEach(item => add(item.name));
  equipmentCategories.forEach(category => add(category.name));
  Object.values(organization.categories || {}).forEach(category => add(category.name));

  for (const source of new Set(equipmentCategories.map(category => category.source))) {
    for (const item of inventory[source]) {
      add(item.equipmentName || item.machineName || item.name || item.model || item.make);
    }
  }
  return [...names.values()].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}
