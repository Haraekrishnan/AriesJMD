'use client';
import './snow.css';

export default function ChristmasDecoration() {
    return (
        <div className="snow-container">
            {/* Snowflakes */}
            {Array.from({ length: 40 }).map((_, i) => (
                <div key={`snow-${i}`} className="snow"></div>
            ))}
            
            {/* Decorations */}
            <div className="decoration sleigh">🎅&#129420;</div>
            <div className="decoration tree tree-1">🎄</div>
            <div className="decoration tree tree-2">🎄</div>
            <div className="decoration snowman">⛄</div>

            {/* Lights */}
            <div className="lights">
                {Array.from({ length: 15 }).map((_, i) => <div key={`light-${i}`} className="light"></div>)}
            </div>

            {/* Stars and Balls */}
            <div className="star star1">✨</div>
            <div className="star star2">⭐</div>
            <div className="star star3">✨</div>
            <div className="star star4">⭐</div>
            <div className="ball ball1"></div>
            <div className="ball ball2"></div>
            <div className="ball ball3"></div>
        </div>
    );
}
