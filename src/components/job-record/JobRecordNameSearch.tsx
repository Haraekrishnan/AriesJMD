'use client';

import { memo, startTransition, useEffect, useState } from 'react';
import { Input } from '../ui/input';

// Keep urgent keystrokes out of the monthly grid's render path. Only the
// settled query triggers its expensive render, at transition priority.
export default memo(function JobRecordNameSearch({ onSearch }: {
    onSearch: (value: string) => void;
}) {
    const [text, setText] = useState('');
    useEffect(() => {
        const timer = setTimeout(() => {
            startTransition(() => onSearch(text));
        }, 180);
        return () => clearTimeout(timer);
    }, [text, onSearch]);

    return <Input
        placeholder="Search by name..."
        className="pl-9 w-full sm:w-64"
        value={text}
        onChange={event => setText(event.target.value)}
    />;
});
