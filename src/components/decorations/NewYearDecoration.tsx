
'use client';
import './new-year.css';

export default function NewYearDecoration() {
    return (
        <div className="new-year-container">
            {/* Fireworks */}
            <div className="firework"></div>
            <div className="firework"></div>
            <div className="firework"></div>
            <div className="firework"></div>
            <div className="firework"></div>

            {/* Confetti */}
            <div className="confetti-container">
                {Array.from({ length: 150 }).map((_, i) => (
                    <div key={`confetti-${i}`} className="confetti"></div>
                ))}
            </div>
            
            <div className="happy-new-year">
                <h1>Happy New Year 2026</h1>
            </div>

            {/* Balloons */}
            <div className="balloon balloon-1">🎈</div>
            <div className="balloon balloon-2">🎉</div>
            <div className="balloon balloon-3">🎈</div>
            <div className="balloon balloon-4">🎊</div>
        </div>
    );
}
