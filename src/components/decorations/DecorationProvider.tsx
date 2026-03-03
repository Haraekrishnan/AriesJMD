'use client';
import { useDecorations } from '@/contexts/decoration-provider';
import dynamic from 'next/dynamic';

const ChristmasDecoration = dynamic(() => import('./ChristmasDecoration'), { ssr: false });
const NewYearDecoration = dynamic(() => import('./NewYearDecoration'), { ssr: false });
const DiwaliDecoration = dynamic(() => import('./DiwaliDecoration'), { ssr: false });


export function DecorationProvider() {
    const { activeTheme } = useDecorations();

    if (!activeTheme || activeTheme === 'none') {
        return null;
    }

    switch (activeTheme) {
        case 'christmas':
            return <ChristmasDecoration />;
        case 'new-year':
            return <NewYearDecoration />;
        case 'diwali':
            return <DiwaliDecoration />;
        default:
            return null;
    }
}
