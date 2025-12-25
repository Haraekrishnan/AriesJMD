
'use client';
import './christmas.css';

export default function ChristmasDecoration() {
    return (
        <div className="snow-container">
            {/* Snowflakes */}
            {Array.from({ length: 40 }).map((_, i) => (
                <div key={`snow-${i}`} className="snow">❄</div>
            ))}
            
            {/* Decorations */}
            <div className="decoration sleigh">🦌🎅</div>
            <div className="decoration tree tree-1">🎄</div>
            <div className="decoration tree tree-2">🎄</div>
            <div className="decoration santa-hat">🎅</div>
            <div className="decoration snowman">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" fill="none" className="w-full h-full">
                <circle cx="40" cy="58" r="20" fill="white" stroke="#E0E0E0" strokeWidth="1"/>
                <circle cx="40" cy="30" r="14" fill="white" stroke="#E0E0E0" strokeWidth="1"/>
                <path d="M26 12L54 12L52 22L28 22L26 12Z" fill="#212121"/>
                <rect x="23" y="21" width="34" height="2" fill="#212121"/>
                <circle cx="36" cy="28" r="1.5" fill="#212121"/>
                <circle cx="44" cy="28" r="1.5" fill="#212121"/>
                <path d="M40 33L43 35L40 37L37 35L40 33Z" fill="#FF8A65"/>
                <path d="M10 40L28 35" stroke="#795548" strokeWidth="2" strokeLinecap="round"/>
                <path d="M52 35L70 40" stroke="#795548" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="40" cy="54" r="1.5" fill="#212121"/>
                <circle cx="40" cy="62" r="1.5" fill="#212121"/>
                <rect x="33" y="44" width="14" height="3" rx="1.5" fill="#F44336"/>
                <path d="M35 47L35 55L32 53" stroke="#F44336" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="decoration gift gift-1">🎁</div>
            <div className="decoration gift gift-2">🎁</div>
            <div className="merry-christmas">
              <h1>Merry Christmas</h1>
            </div>


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
