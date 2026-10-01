import type { TpCertListItem } from '@/lib/types';
export const tpItemKey = (item: Pick<TpCertListItem, 'itemId' | 'itemType'>) => item.itemType + ':' + item.itemId;
export const tpItemCondition = (item: Pick<TpCertListItem, 'condition'>): 'New' | 'Old' => item.condition === 'New' ? 'New' : 'Old';
export function setTpItemConditions(items: TpCertListItem[], keys: ReadonlySet<string>, condition: 'New' | 'Old') {
 return items.map(item => keys.has(tpItemKey(item)) ? {...item, condition} : item);
}
