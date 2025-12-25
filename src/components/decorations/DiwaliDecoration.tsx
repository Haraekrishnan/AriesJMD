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

            {/* Bottom Diyas */}
            <div className="bottom-diya-container">
                 {Array.from({ length: 12 }).map((_, i) => (
                    <div key={`bottom-diya-${i}`} className="diya">
                        <div className="flame"></div>
                        <div className="pot"></div>
                    </div>
                ))}
            </div>

            {/* Fireworks and Crackers */}
            <div className="firework"></div>
            <div className="firework"></div>
            <div className="firework"></div>
            <div className="firework"></div>
            <div className="firework"></div>
            
            <div className="cracker"></div>
            <div className="cracker"></div>
            <div className="cracker"></div>
            <div className="cracker"></div>
            <div className="cracker"></div>

            {/* Lights */}
            <div className="lights">
                {Array.from({ length: 15 }).map((_, i) => <div key={`light-${i}`} className="light"></div>)}
            </div>
        </div>
    );
}
