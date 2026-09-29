export interface EquipmentCategory { id: string; name: string; }
export interface EquipmentOrganization { categories?: Record<string, EquipmentCategory>; assignments?: Record<string, string>; }
export function equipmentKey(source: string, id: string) { return source + ':' + id; }
export function addEquipmentCategory(state: EquipmentOrganization | null, category: EquipmentCategory, reserved: string[]): EquipmentOrganization {
  const name = category.name.trim().replace(/\s+/g, ' ');
  if (!name || name.length > 60) throw new Error('Enter a category name between 1 and 60 characters.');
  const names = [...reserved, ...Object.values(state?.categories || {}).map(c => c.name)];
  if (names.some(existing => existing.trim().toLowerCase() === name.toLowerCase())) throw new Error('That category already exists.');
  return {...state, categories: {...state?.categories, [category.id]: {...category, name}}};
}
export function moveEquipmentCategories(state: EquipmentOrganization | null, keys: string[], destination: string, builtins: string[]): EquipmentOrganization {
  if (!builtins.includes(destination) && !state?.categories?.[destination]) throw new Error('Choose an existing destination category.');
  if (!keys.length) throw new Error('Select equipment to move.');
  const assignments = {...state?.assignments};
  keys.forEach(key => { assignments[key] = destination; });
  return {...state, assignments};
}
export function renameEquipmentCategory(state: EquipmentOrganization | null, id: string, name: string, reserved: string[]): EquipmentOrganization {
  if (!state?.categories?.[id]) throw new Error('This custom category no longer exists.');
  const categories = {...state.categories};
  delete categories[id];
  return addEquipmentCategory({...state, categories}, {id, name}, reserved);
}
export function deleteEquipmentCategory(state: EquipmentOrganization | null, id: string, expectedName: string): EquipmentOrganization {
  if (!state?.categories?.[id]) throw new Error('This custom category no longer exists.');
  if (state.categories[id].name !== expectedName) throw new Error('The category was renamed. Close this dialog and confirm deletion again.');
  const categories = {...state.categories};
  const assignments = {...state.assignments};
  delete categories[id];
  Object.entries(assignments).forEach(([key, category]) => { if (category === id) delete assignments[key]; });
  return {...state, categories, assignments};
}
