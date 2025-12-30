
'use client';
import { useEffect, useRef } from 'react';
import { initFireworks, stopFireworks } from '@/lib/fireworks-animation';

const Fireworks = () => {
    // We only want to initialize the fireworks script once.
    const isInitialized = useRef(false);

    useEffect(() => {
        // Ensure this only runs on the client
        if (typeof window !== 'undefined' && !isInitialized.current) {
            // The initFireworks function will set up everything, including stages and loops.
            initFireworks();
            isInitialized.current = true;
        }
        
        // Cleanup function to stop the animation loop when the component unmounts.
        return () => {
            stopFireworks();
            isInitialized.current = false; // Allow re-initialization if component remounts
        };
    }, []);

    // These canvas elements are required by the fireworks simulation script.
    return (
        <div className="canvas-container">
            <canvas id="trails-canvas"></canvas>
            <canvas id="main-canvas"></canvas>
        </div>
    );
};

export default Fireworks;
