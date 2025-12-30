
'use client';
import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { ref, onValue, set } from 'firebase/database';
import { rtdb } from '@/lib/rtdb';
import type { DecorationTheme } from '@/lib/types';
import { useAuth } from './auth-provider';

interface DecorationContextType {
    activeTheme: DecorationTheme | null;
    updateActiveTheme: (theme: DecorationTheme) => void;
}

const DecorationContext = createContext<DecorationContextType | undefined>(undefined);

export function DecorationContextProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [activeTheme, setActiveTheme] = useState<DecorationTheme | null>(null);

    useEffect(() => {
        const themeRef = ref(rtdb, 'decorations/activeTheme');
        const unsubscribe = onValue(themeRef, (snapshot) => {
            setActiveTheme(snapshot.val() || 'none');
        });
        return () => unsubscribe();
    }, []);

    const updateActiveTheme = (theme: DecorationTheme) => {
        if (user && (user.role === 'Admin' || user.role === 'Project Coordinator')) {
            set(ref(rtdb, 'decorations/activeTheme'), theme);
        }
    };

    return (
        <DecorationContext.Provider value={{ activeTheme, updateActiveTheme }}>
            {children}
        </DecorationContext.Provider>
    );
}

export const useDecorations = (): DecorationContextType => {
    const context = useContext(DecorationContext);
    if (!context) {
        // This check is good practice, but the AppProvider structure prevents this error.
        throw new Error('useDecorations must be used within a DecorationContextProvider');
    }
    return context;
};
