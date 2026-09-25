'use client';
import styles from './manpower-list.module.css';
interface Props { total: number; page: number; pageSize: number; onPageChange: (page: number) => void; onPageSizeChange: (size: number) => void; }
export default function ManpowerPagination({total,page,pageSize,onPageChange,onPageSizeChange}: Props) {
  const count = Math.max(1, Math.ceil(total/pageSize));
  const pages = Array.from(new Set([1, count, ...Array.from({length:5}, (_,i)=>page+i-2).filter(n=>n>=1&&n<=count)])).sort((a,b)=>a-b);
  return <nav className={styles.pagination} aria-label="Manpower table pagination">
    <span>Showing {total ? (page-1)*pageSize+1 : 0} to {Math.min(page*pageSize,total)} of {total} entries</span>
    <label>Rows per page: <select value={pageSize} onChange={e=>onPageSizeChange(Number(e.target.value))}>{[10,25,50,100].map(n=><option key={n} value={n}>{n}</option>)}</select></label>
    <div className={styles.pageButtons}>
      <button type="button" aria-label="First page" disabled={page===1} onClick={()=>onPageChange(1)}>«</button>
      <button type="button" aria-label="Previous page" disabled={page===1} onClick={()=>onPageChange(page-1)}>‹</button>
      {pages.map((n,i)=><span key={n}>{i>0&&n-pages[i-1]>1&&<span className={styles.ellipsis}>…</span>}<button type="button" aria-label={'Page '+n} aria-current={n===page?'page':undefined} onClick={()=>onPageChange(n)}>{n}</button></span>)}
      <button type="button" aria-label="Next page" disabled={page===count} onClick={()=>onPageChange(page+1)}>›</button>
      <button type="button" aria-label="Last page" disabled={page===count} onClick={()=>onPageChange(count)}>»</button>
    </div>
  </nav>;
}
