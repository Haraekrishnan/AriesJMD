'use client';
import { useDecorations } from '@/contexts/decoration-provider';
import ChristmasDecoration from './ChristmasDecoration';
import NewYearDecoration from './NewYearDecoration';
import dynamic from 'next/dynamic';

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
        default:
            return null;
    }
}
