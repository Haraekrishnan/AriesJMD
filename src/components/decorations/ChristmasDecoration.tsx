
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
        </div>
    );
}
