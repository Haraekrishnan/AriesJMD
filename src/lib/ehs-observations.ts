'use client';
/**
 * @fileOverview EHS Observation & CAPA Utility Library
 */

import { parseISO, isAfter, isValid } from 'date-fns';
import type { EhsObservation, CapaStage } from './types';

export const CAPA_STAGES: CapaStage[] = [
  'Initiation',
  'Investigation',
  'Resolution',
  'Implementation',
  'Effectiveness Review',
  'Reference',
  'Closure'
];

export interface ObservationFilters {
  search: string;
  category: string;
  risk: string;
  status: string;
  site: string;
  date?: Date;
}

export const EMPTY_OBSERVATION_FILTERS: ObservationFilters = {
  search: '',
  category: 'all',
  risk: 'all',
  status: 'all',
  site: 'all',
  date: undefined,
};

export function isObservationOverdue(observation: EhsObservation): boolean {
  if (observation.status === 'Closed') return false;
  if (!observation.targetDate) return false;
  
  const targetDate = parseISO(observation.targetDate);
  return isValid(targetDate) && isAfter(new Date(), targetDate);
}
