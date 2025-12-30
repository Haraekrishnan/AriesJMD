.new-year-container {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
    z-index: 5;
    pointer-events: none;
}

.balloon {
    position: absolute;
    border-radius: 50%;
    opacity: 0.7;
    animation: rise 10s infinite ease-in;
}

.balloon-1 {
    width: 100px;
    height: 100px;
    background: gold;
    left: 10%;
    bottom: -100px;
    animation-duration: 12s;
}

.balloon-2 {
    width: 120px;
    height: 120px;
    background: #FFD700;
    left: 50%;
    bottom: -120px;
    animation-duration: 15s;
    animation-delay: 2s;
}

.balloon-3 {
    width: 80px;
    height: 80px;
    background: #FFA500;
    right: 15%;
    bottom: -80px;
    animation-duration: 10s;
    animation-delay: 1s;
}

@keyframes rise {
    0% {
        transform: translateY(0);
        opacity: 0.7;
    }
    100% {
        transform: translateY(-120vh);
        opacity: 0;
    }
}


.flying-balloon {
    position: absolute;
    bottom: -50px;
    font-size: 2rem;
    animation: fly-up 8s infinite ease-in;
}

@keyframes fly-up {
  0% {
    transform: translateY(0) rotate(0deg);
    opacity: 1;
  }
  100% {
    transform: translateY(-100vh) rotate(360deg);
    opacity: 0;
  }
}

.firework {
	position: absolute;
}
.firework, .firework::before, .firework::after {
	--w: 3px;
	--h: 20px;
	--c: goldenrod;
	content: "";
	position: absolute;
	width: var(--w);
	height: var(--h);
	border-radius: 50%;
	background: var(--c);
	transform-origin: 50% 100%;
	animation: firework 2s ease-in-out infinite;
}
.firework {
	--c: red;
	left: 20%;
	top: 30%;
	transform: rotate(-15deg);
	animation-delay: 0.2s;
}
.firework.second {
	--c: lime;
	left: 70%;
	top: 20%;
	transform: rotate(20deg);
	animation-delay: 0.8s;
}
.firework.third {
	--c: blue;
	left: 50%;
	top: 50%;
	transform: rotate(5deg);
	animation-delay: 1.2s;
}
.firework::before {
	transform: rotate(30deg);
}
.firework::after {
	transform: rotate(-30deg);
}
@keyframes firework {
	0%, 100% {
		transform: translateY(20px) rotate(-15deg) scaleY(0);
	}
	25% {
		transform: translateY(-10px) rotate(-15deg) scaleY(1.2);
	}
	50% {
		transform: translateY(-30px) rotate(-15deg) scale(1, 0.5);
		opacity: 1;
	}
	70% {
		transform: translateY(-120px) rotate(-15deg) scale(0);
		opacity: 0;
	}
}

.firecracker-container {
    position: absolute;
}
.firecracker-1 {
    bottom: 10%;
    right: 5%;
}
.firecracker-2 {
    bottom: 20%;
    left: 70%;
}
.firecracker {
    position: relative;
    width: 6px;
    height: 40px;
    background-color: #c0392b;
    border-radius: 2px;
    transform-origin: bottom center;
    animation: firecracker-shake 2.5s infinite ease-in-out;
}

.firecracker::before {
    content: '';
    position: absolute;
    top: -10px;
    left: 50%;
    transform: translateX(-50%);
    width: 2px;
    height: 10px;
    background-color: #2c3e50;
    animation: burn-fuse 2.5s infinite linear;
}

.firecracker::after {
    content: '';
    position: absolute;
    top: -12px;
    left: 50%;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background-color: #f1c40f;
    transform: translateX(-50%);
    opacity: 0;
    animation: fuse-spark 2.5s infinite linear;
}

@keyframes firecracker-shake {
    0%, 100% { transform: rotate(0deg); }
    10%, 30%, 50% { transform: rotate(-3deg); }
    20%, 40% { transform: rotate(3deg); }
    60% { opacity: 1; transform: scaleY(1); }
    80% { opacity: 0; transform: scaleY(0); }
}

@keyframes burn-fuse {
    0% { height: 10px; top: -10px; }
    60% { height: 0px; top: 0; }
    100% { height: 0px; top: 0; }
}

@keyframes fuse-spark {
    0% { opacity: 1; }
    5%, 15%, 25%, 35%, 45%, 55% { opacity: 0.5; transform: translateX(-50%) scale(1.2); }
    10%, 20%, 30%, 40%, 50%, 60% { opacity: 1; transform: translateX(-50%) scale(1); }
    61% { opacity: 0; }
}

.happy-new-year {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    text-align: center;
}

.happy-new-year h1 {
    font-family: 'Mountains of Christmas', cursive;
    font-size: 4rem;
    color: #ffd700;
    text-shadow: 0 0 10px #fff, 0 0 20px #ffc107;
}

.lights {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
}

@keyframes flash {
  0%, 100% { background-color: rgba(255,255,255,0.7); box-shadow: 0 0 5px rgba(255,255,255,0.7); }
  50% { background-color: var(--light-color); box-shadow: 0 0 10px 2px var(--light-color); }
}

.light {
    position: absolute;
    width: 5px;
    height: 5px;
    border-radius: 50%;
    animation: flash 2s infinite;
}

.light:nth-child(1) { top: 5%; left: 10%; --light-color: #f00; animation-delay: 0s; }
.light:nth-child(2) { top: 8%; left: 30%; --light-color: #0f0; animation-delay: 0.2s; }
.light:nth-child(3) { top: 4%; left: 50%; --light-color: #00f; animation-delay: 0.4s; }
.light:nth-child(4) { top: 9%; left: 70%; --light-color: #ff0; animation-delay: 0.6s; }
.light:nth-child(5) { top: 6%; left: 90%; --light-color: #f0f; animation-delay: 0.8s; }
.light:nth-child(6) { top: 15%; left: 5%; --light-color: #0ff; animation-delay: 1s; }
.light:nth-child(7) { top: 12%; left: 25%; --light-color: #f00; animation-delay: 1.2s; }
.light:nth-child(8) { top: 16%; left: 45%; --light-color: #0f0; animation-delay: 1.4s; }
.light:nth-child(9) { top: 13%; left: 65%; --light-color: #00f; animation-delay: 1.6s; }
.light:nth-child(10) { top: 17%; left: 85%; --light-color: #ff0; animation-delay: 1.8s; }
.light:nth-child(11) { top: 80%; left: 15%; --light-color: #f0f; animation-delay: 0.3s; }
.light:nth-child(12) { top: 90%; left: 35%; --light-color: #0ff; animation-delay: 0.9s; }
.light:nth-child(13) { top: 85%; left: 55%; --light-color: #f00; animation-delay: 1.3s; }
.light:nth-child(14) { top: 95%; left: 75%; --light-color: #0f0; animation-delay: 0.7s; }
.light:nth-child(15) { top: 88%; left: 95%; --light-color: #00f; animation-delay: 1.5s; }
.light:nth-child(16) { top: 55%; left: 80%; --light-color: #f0f; animation-delay: 1.1s; }
.light:nth-child(17) { top: 65%; left: 95%; --light-color: #0ff; animation-delay: 0.1s; }
.light:nth-child(18) { top: 75%; left: 20%; --light-color: #f00; animation-delay: 0.5s; }
.light:nth-child(19) { top: 85%; left: 50%; --light-color: #0f0; animation-delay: 1.7s; }
.light:nth-child(20) { top: 95%; left: 85%; --light-color: #00f; animation-delay: 0.3s; }