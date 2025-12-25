
'use client';
import './new-year.css';

export default function NewYearDecoration() {
    return (
        <div className="new-year-container">
            {/* --- BIG CIRCLES --- */}
            <div className="balloon balloon-1"></div>
            <div className="balloon balloon-2"></div>
            <div className="balloon balloon-3"></div>
            
            {/* --- CONFETTI --- */}
            {Array.from({ length: 10 }).map((_, i) => (
                <div key={`confetti-${i}`} className="firework"></div>
            ))}

            <div className="happy-new-year">
                <h1>Happy New Year 2026</h1>
            </div>
        </div>
    );
}
