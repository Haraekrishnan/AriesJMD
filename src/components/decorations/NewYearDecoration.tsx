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
            {Array.from({ length: 15 }).map((_, i) => (
                <div key={`confetti-${i}`} className="firework"></div>
            ))}
            
            {/* --- FLYING BALLOONS --- */}
            <div className="flying-balloon" style={{ left: '15%', animationDelay: '0s' }}>🎈</div>
            <div className="flying-balloon" style={{ left: '25%', animationDelay: '2s' }}>🎉</div>
            <div className="flying-balloon" style={{ left: '35%', animationDelay: '4s' }}>🎊</div>
            <div className="flying-balloon" style={{ left: '45%', animationDelay: '1s' }}>🎈</div>
            <div className="flying-balloon" style={{ left: '55%', animationDelay: '3s' }}>🎉</div>
            <div className="flying-balloon" style={{ left: '65%', animationDelay: '5s' }}>🎊</div>
            <div className="flying-balloon" style={{ left: '75%', animationDelay: '0.5s' }}>🎈</div>
            <div className="flying-balloon" style={{ left: '85%', animationDelay: '2.5s' }}>🎉</div>


            <div className="happy-new-year">
                <h1>Happy New Year 2026</h1>
            </div>

            {/* --- Illumination Bulbs --- */}
            <div className="lights">
                {Array.from({ length: 20 }).map((_, i) => (
                    <div key={`light-${i}`} className="light"></div>
                ))}
            </div>

            {/* --- Fire Crackers --- */}
            <div className="cracker"></div>
            <div className="cracker"></div>
            <div className="cracker"></div>
        </div>
    );
}
