'use client';

import { forwardRef, useCallback, useLayoutEffect, useRef, type TextareaHTMLAttributes } from 'react';

/** Worksheet text stays visible while typing, pasting, loading or resizing columns. */
const ScheduleTextCell = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function ScheduleTextCell({ onInput, value, defaultValue, ...props }, forwardedRef) {
    const elementRef = useRef<HTMLTextAreaElement | null>(null);
    const resize = useCallback(() => {
      const element = elementRef.current;
      if (!element || element.clientWidth === 0) return;
      const style = window.getComputedStyle(element);
      const borders = (parseFloat(style.borderTopWidth) || 0) + (parseFloat(style.borderBottomWidth) || 0);
      element.style.height = '0px';
      element.style.height = `${Math.max(34, element.scrollHeight + borders)}px`;
    }, []);
    const attachRef = useCallback((element: HTMLTextAreaElement | null) => {
      elementRef.current = element;
      if (typeof forwardedRef === 'function') forwardedRef(element);
      else if (forwardedRef) forwardedRef.current = element;
    }, [forwardedRef]);

    useLayoutEffect(() => { resize(); }, [value, defaultValue, resize]);
    useLayoutEffect(() => {
      const element = elementRef.current;
      if (!element) return;
      let lastWidth = element.clientWidth;
      const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => {
        if (element.clientWidth !== lastWidth) { lastWidth = element.clientWidth; resize(); }
      });
      observer?.observe(element);
      window.addEventListener('resize', resize);
      return () => { observer?.disconnect(); window.removeEventListener('resize', resize); };
    }, [resize]);

    return <textarea {...props} ref={attachRef} value={value} defaultValue={defaultValue} rows={1} wrap="soft"
      onInput={event => { resize(); onInput?.(event); }} />;
  }
);

export default ScheduleTextCell;
