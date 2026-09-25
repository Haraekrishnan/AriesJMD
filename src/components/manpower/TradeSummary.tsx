
'use client';
import { useMemo } from 'react';
import { useManpower } from '@/contexts/manpower-provider';
import { HardHat, Users } from 'lucide-react';
import styles from './manpower-list.module.css';
import { TRADES } from '@/lib/mock-data';

export default function TradeSummary() {
  const { manpowerProfiles } = useManpower();

  const tradeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    const activeProfiles = manpowerProfiles.filter(p => p.status === 'Working');
    
    activeProfiles.forEach(profile => {
        const tradeKey = TRADES.includes(profile.trade) ? profile.trade : 'Others';
        counts.set(tradeKey, (counts.get(tradeKey) || 0) + 1);
    });

    return counts;
  }, [manpowerProfiles]);

  const totalWorkingManpower = useMemo(() => {
      return Array.from(tradeCounts.values()).reduce((sum, count) => sum + count, 0);
  }, [tradeCounts]);
  
  const allTradesToDisplay = [...TRADES];

  const cards = [{title: 'Total Working', value: totalWorkingManpower, description: 'Total active workforce'}, ...allTradesToDisplay.filter(trade => tradeCounts.has(trade)).map(trade => ({title: trade, value: tradeCounts.get(trade) || 0, description: 'Total working in '+trade+' trade'}))];
  return <section className={styles.metrics} aria-label="Working manpower by trade">{cards.map((card,index) => {
    const Icon=index===0?Users:HardHat;
    return <article className={styles.metric} key={card.title} data-tone={index%5}><span className={styles.metricIcon}><Icon aria-hidden="true" /></span><div><h2>{card.title}</h2><strong>{card.value.toLocaleString()}</strong><p>{card.description}</p></div></article>;
  })}</section>;
}
