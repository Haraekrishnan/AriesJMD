
'use client';
import { useDecorations } from '@/contexts/decoration-provider';
import ChristmasDecoration from './ChristmasDecoration';
// Import other decorations here, e.g., import DiwaliDecoration from './DiwaliDecoration';

export function DecorationProvider() {
    const { activeTheme } = useDecorations();

    if (!activeTheme || activeTheme === 'none') {
        return null;
    }

    switch (activeTheme) {
        case 'christmas':
            return <ChristmasDecoration />;
        // case 'diwali':
        //     return <DiwaliDecoration />;
        default:
            return null;
    }
}
