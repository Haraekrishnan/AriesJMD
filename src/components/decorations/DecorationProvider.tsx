
'use client';
import { useDecorations } from '@/contexts/decoration-provider';
import ChristmasDecoration from './ChristmasDecoration';
// import DiwaliDecoration from './DiwaliDecoration';
import NewYearDecoration from './NewYearDecoration';
import dynamic from 'next/dynamic';

const DiwaliDecoration = dynamic(() => import('./DiwaliDecoration'), {
    ssr: false,
});


export function DecorationProvider() {
    const { activeTheme } = useDecorations();

    if (!activeTheme || activeTheme === 'none') {
        return null;
    }

    switch (activeTheme) {
        case 'christmas':
            return <ChristmasDecoration />;
        case 'diwali':
            return <DiwaliDecoration />;
        case 'new-year':
            return <NewYearDecoration />;
        default:
            return null;
    }
}
