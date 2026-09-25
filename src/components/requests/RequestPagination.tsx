'use client';

import { useEffect, useMemo, useState } from 'react';
import styles from './my-requests.module.css';

const PAGE_SIZE = 8;

export function useRequestPages<T>(requests: T[]) {
  const [requestedPage, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(requests.length / PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);
  useEffect(() => { setPage(current => Math.min(current, totalPages)); }, [totalPages]);
  const items = useMemo(() => requests.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [requests, page]);
  return { items, page, totalPages, setPage, total: requests.length };
}

export function requestPageNumbers(page: number, totalPages: number): (number | string)[] {
  const visible = new Set([1, totalPages]);
  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  for (let value = start; value <= Math.min(totalPages, start + 4); value++) visible.add(value);
  const numbers = [...visible].sort((a, b) => a - b);
  const result: (number | string)[] = [];
  numbers.forEach((value, index) => {
    if (index && value - numbers[index - 1] > 1) result.push('gap-' + value);
    result.push(value);
  });
  return result;
}

export default function RequestPagination({ page, totalPages, total, setPage, label }: {
  page: number; totalPages: number; total: number; setPage: (page: number) => void; label: string;
}) {
  if (!total) return null;
  return <nav className={styles.pagination} aria-label={label + ' pagination'}>
    <span className={styles.pageSummary} aria-live="polite">Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}</span>
    <div className={styles.pageButtons}>
      <button type="button" aria-label="Previous page" disabled={page === 1} onClick={() => setPage(page - 1)}>‹</button>
      {requestPageNumbers(page, totalPages).map(value => typeof value === 'number'
        ? <button type="button" key={value} aria-label={'Page ' + value} aria-current={page === value ? 'page' : undefined} onClick={() => setPage(value)}>{value}</button>
        : <span key={value} aria-hidden="true">…</span>)}
      <button type="button" aria-label="Next page" disabled={page === totalPages} onClick={() => setPage(page + 1)}>›</button>
    </div>
  </nav>;
}
