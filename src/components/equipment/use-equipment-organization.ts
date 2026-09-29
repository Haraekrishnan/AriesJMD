'use client';
import { useEffect, useState } from 'react';
import { onValue, ref } from 'firebase/database';
import { rtdb } from '@/lib/rtdb';
import type { EquipmentOrganization } from './equipment-categories';
export function useEquipmentOrganization() {
  const [state, setState] = useState<EquipmentOrganization>({});
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => onValue(ref(rtdb, 'equipmentOrganization'), snapshot => {
    setState(snapshot.val() || {}); setReady(true); setError('');
  }, error => { setError(error.message); setReady(true); }), []);
  return {state, ready, error};
}
