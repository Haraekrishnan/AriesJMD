'use client';
import { useEffect, useRef } from 'react';
import { initFireworks } from '@/lib/fireworks-animation';

const Fireworks = () => {
    const isInitialized = useRef(false);

    useEffect(() => {
        if (!isInitialized.current) {
            // The initFireworks function will set up everything, including stages and loops.
            // It's designed to run once.
            initFireworks();
            isInitialized.current = true;
        }
        
        // No cleanup needed since the animation loop is managed globally by the script
        // and should persist as long as the component is potentially visible.
    }, []);

    return (
        <div className="canvas-container">
            <canvas id="trails-canvas" ref={useRef<HTMLCanvasElement>(null)}></canvas>
            <canvas id="main-canvas" ref={useRef<HTMLCanvasElement>(null)}></canvas>
        </div>
    );
};

export default Fireworks;
