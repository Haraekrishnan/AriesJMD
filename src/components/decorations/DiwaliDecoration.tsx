'use client';
import './diwali.css';

export default function DiwaliDecoration() {
    return (
        <div className="diwali-container">
            {/* Header Lanterns */}
            <div className="header-lantern lantern-1">🏮</div>
            <div className="header-lantern lantern-2">🏮</div>
            <div className="header-lantern lantern-3">🏮</div>

            {/* Happy Diwali Text */}
            <div className="happy-diwali">
                <h1>Happy Diwali</h1>
            </div>

            {/* Chart Diyas */}
            <div className="chart-diya-container">
                 {Array.from({ length: 12 }).map((_, i) => (
                    <div key={`chart-diya-${i}`} className="diya">
                        <div className="flame"></div>
                        <div className="pot"></div>
                    </div>
                ))}
            </div>


            {/* Fireworks */}
            <div className="firework"></div>
            <div className="firework"></div>
            <div className="firework"></div>
            <div className="firework"></div>
            <div className="firework"></div>
        </div>
    );
}
