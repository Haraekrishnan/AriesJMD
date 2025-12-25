
'use client';
import './diwali.css';

export default function DiwaliDecoration() {
    return (
        <div className="diwali-container">
            {/* Happy Diwali Text */}
            <div className="happy-diwali">
                <h1>Happy Diwali</h1>
            </div>

            {/* Lanterns */}
            <div className="lantern-group">
                <div className="lantern lantern-1">🏮</div>
                <div className="lantern lantern-2">🏮</div>
                <div className="lantern lantern-3">🏮</div>
                <div className="lantern lantern-4">🏮</div>
            </div>

            {/* Diyas */}
            <div className="diya-row">
                {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="diya">
                        <div className="flame"></div>
                        <div className="pot"></div>
                    </div>
                ))}
            </div>

            {/* Fireworks */}
            <div className="firework"></div>
            <div className="firework"></div>
            <div className="firework"></div>
        </div>
    );
}
