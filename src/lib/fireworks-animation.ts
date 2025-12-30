// Adapted from a CodePen by Caleb Miller: https://codepen.io/MillerTime/pen/XgpNwb
// This code has been converted to TypeScript and refactored to work within a React/Next.js environment.

// Type definitions
type Point = {
	x: number;
	y: number;
};

// Internal state, not part of the original public API but necessary for encapsulation
interface StarState {
	visible: boolean;
	heavy: boolean;
	x: number;
	y: number;
	prevX: number;
	prevY: number;
	color: string;
	speedX: number;
	speedY: number;
	life: number;
	fullLife: number;
	spinAngle: number;
	spinSpeed: number;
	spinRadius: number;
	sparkFreq: number;
	sparkSpeed: number;
	sparkTimer: number;
	sparkColor: string;
	sparkLife: number;
	sparkLifeVariation: number;
	strobe: boolean;
	strobeFreq?: number;
	transitionTime?: number;
	secondColor?: string | null;
	colorChanged?: boolean;
	onDeath?: (star: StarState) => void;
	updateFrame?: number;
}

interface SparkState {
	x: number;
	y: number;
	prevX: number;
	prevY: number;
	color: string;
	speedX: number;
	speedY: number;
	life: number;
}

interface BurstFlashState {
    x: number;
    y: number;
    radius: number;
}


// Math utilities
const MyMath = {
    random: (min: number, max: number): number => Math.random() * (max - min) + min,
    clamp: (val: number, min: number, max: number): number => Math.max(min, Math.min(val, max)),
    pointDist: (x1: number, y1: number, x2: number, y2: number): number => {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    },
    pointAngle: (x1: number, y1: number, x2: number, y2: number): number => Math.atan2(y2 - y1, x2 - x1),
	randomChoice: <T>(arr: T[]): T => arr[Math.random() * arr.length | 0],
};


// Main class for managing a canvas element
export class Stage {
	private canvas: HTMLCanvasElement;
	public ctx: CanvasRenderingContext2D;
	public width: number;
	public height: number;
	public dpr: number;

	constructor(canvasId: string) {
		const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
		if (!canvas) {
			throw new Error(`Canvas with id "${canvasId}" not found.`);
		}
		this.canvas = canvas;
		this.ctx = this.canvas.getContext('2d')!;
		this.width = this.canvas.width;
		this.height = this.canvas.height;
		this.dpr = window.devicePixelRatio || 1;
		this.resize(window.innerWidth, window.innerHeight);
	}

	resize(width: number, height: number) {
		this.width = width;
		this.height = height;
		this.dpr = window.devicePixelRatio || 1;
		this.canvas.width = width * this.dpr;
		this.canvas.height = height * this.dpr;
		this.canvas.style.width = `${width}px`;
		this.canvas.style.height = `${height}px`;
		this.ctx.scale(this.dpr, this.dpr);
	}
}


// Simulation constants and configuration
const IS_MOBILE = window.innerWidth <= 640;
const IS_DESKTOP = window.innerWidth > 800;

const GRAVITY = 0.9; // pixels/second/second
let simSpeed = 1;

// Configurable globals, will be managed by the simulation controller
let quality = IS_DESKTOP ? 2 : 1; // 1=low, 2=normal, 3=high
let isLowQuality = quality === 1;
let isHighQuality = quality === 3;
let skyLighting = 2; // 0=none, 1=dim, 2=normal
let scaleFactor = IS_MOBILE ? 0.9 : 1;
let stageW: number, stageH: number;


// --- Color Management ---
const COLOR = {
	Red: '#ff0043',
	Green: '#14fc56',
	Blue: '#1e7fff',
	Purple: '#e60aff',
	Gold: '#ffbf36',
	White: '#ffffff'
};
const INVISIBLE = '_INVISIBLE_';
const COLOR_NAMES = Object.keys(COLOR);
const COLOR_CODES = Object.values(COLOR);
const COLOR_CODES_W_INVIS = [...COLOR_CODES, INVISIBLE];

const COLOR_TUPLES: Record<string, { r: number, g: number, b: number }> = {};
COLOR_CODES.forEach(hex => {
	COLOR_TUPLES[hex] = {
		r: parseInt(hex.substr(1, 2), 16),
		g: parseInt(hex.substr(3, 2), 16),
		b: parseInt(hex.substr(5, 2), 16),
	};
});

function randomColorSimple() {
	return MyMath.randomChoice(COLOR_CODES);
}

let lastColor: string;
function randomColor(options?: { notSame?: boolean, notColor?: string, limitWhite?: boolean }): string {
	const notSame = options?.notSame;
	const notColor = options?.notColor;
	const limitWhite = options?.limitWhite;
	let color = randomColorSimple();
	
	if (limitWhite && color === COLOR.White && Math.random() < 0.6) {
		color = randomColorSimple();
	}
	
	if (notSame) {
		while (color === lastColor) {
			color = randomColorSimple();
		}
	} else if (notColor) {
		while (color === notColor) {
			color = randomColorSimple();
		}
	}
	
	lastColor = color;
	return color;
}

function whiteOrGold() {
	return Math.random() < 0.5 ? COLOR.Gold : COLOR.White;
}


// --- Particle Pools and Collections ---
function createParticleCollection<T>(): Record<string, T[]> {
	const collection: Record<string, T[]> = {};
	COLOR_CODES_W_INVIS.forEach(color => {
		collection[color] = [];
	});
	return collection;
}

const Star = {
	drawWidth: 3,
	airDrag: 0.98,
	airDragHeavy: 0.992,
	active: createParticleCollection<StarState>(),
	_pool: [] as StarState[],
	
	_new: (): StarState => ({}) as StarState,

	add(x: number, y: number, color: string, angle: number, speed: number, life: number, speedOffX = 0, speedOffY = 0): StarState {
		const instance = this._pool.pop() || this._new();
		
		instance.visible = true;
		instance.heavy = false;
		instance.x = x;
		instance.y = y;
		instance.prevX = x;
		instance.prevY = y;
		instance.color = color;
		instance.speedX = Math.sin(angle) * speed + speedOffX;
		instance.speedY = Math.cos(angle) * speed + speedOffY;
		instance.life = life;
		instance.fullLife = life;
		instance.spinAngle = Math.random() * Math.PI * 2;
		instance.spinSpeed = 0.8;
		instance.spinRadius = 0;
		instance.sparkFreq = 0;
		instance.sparkSpeed = 1;
		instance.sparkTimer = 0;
		instance.sparkColor = color;
		instance.sparkLife = 750;
		instance.sparkLifeVariation = 0.25;
		instance.strobe = false;
		instance.onDeath = undefined;
		instance.secondColor = null;
		instance.transitionTime = 0;
		instance.colorChanged = false;
		
		this.active[color].push(instance);
		return instance;
	},

	returnInstance(instance: StarState) {
		instance.onDeath?.(instance);
		this._pool.push(instance);
	}
};

const Spark = {
	drawWidth: 1,
	airDrag: 0.9,
	active: createParticleCollection<SparkState>(),
	_pool: [] as SparkState[],
	
	_new: (): SparkState => ({}) as SparkState,

	add(x: number, y: number, color: string, angle: number, speed: number, life: number): SparkState {
		const instance = this._pool.pop() || this._new();
		
		instance.x = x;
		instance.y = y;
		instance.prevX = x;
		instance.prevY = y;
		instance.color = color;
		instance.speedX = Math.sin(angle) * speed;
		instance.speedY = Math.cos(angle) * speed;
		instance.life = life;
		
		this.active[color].push(instance);
		return instance;
	},

	returnInstance(instance: SparkState) {
		this._pool.push(instance);
	}
};


const BurstFlash = {
	active: [] as BurstFlashState[],
	_pool: [] as BurstFlashState[],
	_new: (): BurstFlashState => ({}) as BurstFlashState,
	add(x: number, y: number, radius: number) {
		const instance = this._pool.pop() || this._new();
		instance.x = x;
		instance.y = y;
		instance.radius = radius;
		this.active.push(instance);
	},
	returnInstance(instance: BurstFlashState) {
		this._pool.push(instance);
	}
};


// --- Shell Logic ---
class Shell {
	// Properties are set by the constructor from options
	[key: string]: any;

	constructor(options: any) {
		Object.assign(this, options);
		if (!this.starCount) {
			const density = options.starDensity || 1;
			const scaledSize = this.spreadSize / 54;
			this.starCount = Math.max(6, scaledSize * scaledSize * density);
		}
	}
	
	launch(position: number, launchHeight: number) {
		const hpad = 60;
		const vpad = 50;
		const minHeightPercent = 0.45;
		const minHeight = stageH - stageH * minHeightPercent;
		
		const launchX = position * (stageW - hpad * 2) + hpad;
		const launchY = stageH;
		const burstY = minHeight - (launchHeight * (minHeight - vpad));
		
		const launchDistance = launchY - burstY;
		const launchVelocity = Math.pow(launchDistance * 0.04, 0.64);
		
		const comet = this.comet = Star.add(
			launchX, launchY,
			typeof this.color === 'string' && this.color !== 'random' ? this.color : COLOR.White,
			Math.PI, launchVelocity,
			launchVelocity * (this.horsetail ? 100 : 400)
		);
		
		comet.heavy = true;
		comet.spinRadius = MyMath.random(0.32, 0.85);
		comet.sparkFreq = 32 / quality;
		comet.sparkLife = 320;
		comet.sparkLifeVariation = 3;
		if (this.color === INVISIBLE) {
			comet.sparkColor = COLOR.Gold;
		}
		
		if (Math.random() > 0.4 && !this.horsetail) {
			comet.secondColor = INVISIBLE;
			comet.transitionTime = Math.pow(Math.random(), 1.5) * 700 + 500;
		}
		
		comet.onDeath = (c: StarState) => this.burst(c.x, c.y);
	}
	
	burst(x: number, y: number) {
		const speed = this.spreadSize / 96;

		let color: string | null = null, onDeath: ((star: StarState) => void) | undefined, sparkFreq = 0, sparkSpeed = 0, sparkLife = 0;
		
		if (this.crossette) onDeath = crossetteEffect;
		if (this.crackle) onDeath = crackleEffect;
		if (this.floral) onDeath = floralEffect;
		
		const starFactory = (angle: number, speedMult: number) => {
			const star = Star.add(
				x, y,
				color || randomColor(),
				angle, speedMult * speed,
				this.starLife + Math.random() * this.starLife * (this.starLifeVariation || 0.125),
				this.horsetail ? this.comet.speedX : 0,
				this.horsetail ? this.comet.speedY : - (this.spreadSize / 1800)
			);

			if (this.secondColor) {
				star.transitionTime = this.starLife * (Math.random() * 0.05 + 0.32);
				star.secondColor = this.secondColor;
			}
			if (this.strobe) {
				star.transitionTime = this.starLife * (Math.random() * 0.08 + 0.46);
				star.strobe = true;
				star.strobeFreq = Math.random() * 20 + 40;
				if (this.strobeColor) {
					star.secondColor = this.strobeColor;
				}
			}
			star.onDeath = onDeath;
		};

		if (typeof this.color === 'string') {
			color = this.color === 'random' ? null : this.color;
			createBurst(this.starCount, starFactory);
		} else if (Array.isArray(this.color)) {
			color = this.color[0];
			createBurst(this.starCount / 2, starFactory);
			color = this.color[1];
			createBurst(this.starCount / 2, starFactory);
		}
		
		BurstFlash.add(x, y, this.spreadSize / 4);
	}
}

// Shell factories
const crysanthemumShell = (size=1) => new Shell({
	shellSize: size,
	spreadSize: 300 + size * 100,
	starLife: 900 + size * 200,
	starDensity: 1.25,
	color: randomColor({ limitWhite: true }),
	pistil: Math.random() < 0.42,
	pistilColor: makePistilColor(randomColor())
});

function makePistilColor(shellColor: string) {
	return (shellColor === COLOR.White || shellColor === COLOR.Gold) ? randomColor({ notColor: shellColor }) : whiteOrGold();
}

function floralEffect(star: StarState) {
	const count = 12 + 6 * quality;
	createBurst(count, (angle, speedMult) => {
		Star.add(star.x, star.y, star.color, angle, speedMult * 2.4, 1000 + Math.random() * 300, star.speedX, star.speedY);
	});
	BurstFlash.add(star.x, star.y, 46);
}

function crossetteEffect(star: StarState) {
	createParticleArc(Math.random() * Math.PI / 2, Math.PI * 2, 4, 0.5, (angle) => {
		Star.add(star.x, star.y, star.color, angle, Math.random() * 0.6 + 0.75, 600);
	});
}

function crackleEffect(star: StarState) {
    const count = isHighQuality ? 32 : 16;
	createParticleArc(0, Math.PI * 2, count, 1.8, (angle) => {
		Spark.add(
			star.x, star.y, COLOR.Gold, angle,
			Math.pow(Math.random(), 0.45) * 2.4,
			300 + Math.random() * 200
		);
	});
}

const shellTypes = {
	'Crysanthemum': crysanthemumShell
};


// --- Simulation Controller ---
let currentFrame = 0;
let autoLaunchTime = 0;
let isPaused = false;
let animationFrameId: number;

function updateGlobals(timeStep: number) {
	currentFrame++;
	if (autoLaunchTime > 0) {
		autoLaunchTime -= timeStep;
	}
	if (autoLaunchTime <= 0) {
        const size = MyMath.random(1, 3);
        const shell = crysanthemumShell(size);
		shell.launch(Math.random(), Math.random() * 0.7);
		autoLaunchTime = 900 + Math.random() * 600 + shell.starLife;
	}
}

function update(frameTime: number, lag: number) {
    if (isPaused) return;

	const timeStep = frameTime * simSpeed;
	const speed = simSpeed * lag;
	
	updateGlobals(timeStep);
	
	const starDrag = 1 - (1 - Star.airDrag) * speed;
	const starDragHeavy = 1 - (1 - Star.airDragHeavy) * speed;
	const sparkDrag = 1 - (1 - Spark.airDrag) * speed;
	const gAcc = timeStep / 1000 * GRAVITY;

	COLOR_CODES_W_INVIS.forEach(color => {
		const stars = Star.active[color];
		for (let i = stars.length - 1; i >= 0; i--) {
			const star = stars[i];
			if (star.updateFrame === currentFrame) continue;
			star.updateFrame = currentFrame;
			
			star.life -= timeStep;
			if (star.life <= 0) {
				stars.splice(i, 1);
				Star.returnInstance(star);
			} else {
				star.prevX = star.x;
				star.prevY = star.y;
				star.x += star.speedX * speed;
				star.y += star.speedY * speed;
				
				if (!star.heavy) {
					star.speedX *= starDrag;
					star.speedY *= starDrag;
				} else {
					star.speedX *= starDragHeavy;
					star.speedY *= starDragHeavy;
				}
				star.speedY += gAcc;
				
				if (star.secondColor && star.life < (star.transitionTime || 0)) {
					star.color = star.secondColor;
					stars.splice(i, 1);
					Star.active[star.secondColor].push(star);
				}
			}
		}
											
		const sparks = Spark.active[color];
		for (let i = sparks.length - 1; i >= 0; i--) {
			const spark = sparks[i];
			spark.life -= timeStep;
			if (spark.life <= 0) {
				sparks.splice(i, 1);
				Spark.returnInstance(spark);
			} else {
				spark.prevX = spark.x;
				spark.prevY = spark.y;
				spark.x += spark.speedX * speed;
				spark.y += spark.speedY * speed;
				spark.speedX *= sparkDrag;
				spark.speedY *= sparkDrag;
				spark.speedY += gAcc;
			}
		}
	});
	
	render(speed);
}

function render(speed: number) {
	const trailsStage = new Stage('trails-canvas');
	const mainStage = new Stage('main-canvas');
	const trailsCtx = trailsStage.ctx;
	const mainCtx = mainStage.ctx;
	
	const dpr = trailsStage.dpr;
	
	trailsCtx.scale(dpr * scaleFactor, dpr * scaleFactor);
	mainCtx.scale(dpr * scaleFactor, dpr * scaleFactor);
	
	trailsCtx.globalCompositeOperation = 'source-over';
	trailsCtx.fillStyle = `rgba(0, 0, 0, 0.175 * ${speed})`;
	trailsCtx.fillRect(0, 0, stageW, stageH);
	
	mainCtx.clearRect(0, 0, stageW, stageH);

	trailsCtx.globalCompositeOperation = 'lighten';
	
	trailsCtx.lineWidth = Star.drawWidth;
	trailsCtx.lineCap = isLowQuality ? 'square' : 'round';
	
	COLOR_CODES.forEach(color => {
		const stars = Star.active[color];
		trailsCtx.strokeStyle = color;
		trailsCtx.beginPath();
		stars.forEach(star => {
			if (star.visible) {
				trailsCtx.moveTo(star.x, star.y);
				trailsCtx.lineTo(star.prevX, star.prevY);
			}
		});
		trailsCtx.stroke();
	});

	trailsCtx.lineWidth = Spark.drawWidth;
	trailsCtx.lineCap = 'butt';
	COLOR_CODES.forEach(color => {
		const sparks = Spark.active[color];
		trailsCtx.strokeStyle = color;
		trailsCtx.beginPath();
		sparks.forEach(spark => {
			trailsCtx.moveTo(spark.x, spark.y);
			trailsCtx.lineTo(spark.prevX, spark.prevY);
		});
		trailsCtx.stroke();
	});

	trailsCtx.setTransform(1, 0, 0, 1, 0, 0);
	mainCtx.setTransform(1, 0, 0, 1, 0, 0);
}


function createBurst(count: number, particleFactory: (angle: number, speedMult: number) => void, startAngle=0, arcLength=Math.PI * 2) {
	const R = 0.5 * Math.sqrt(count / Math.PI);
	const C = 2 * R * Math.PI;
	const C_HALF = C / 2;
	
	for (let i = 0; i <= C_HALF; i++) {
		const ringAngle = i / C_HALF * Math.PI / 2;
		const ringSize = Math.cos(ringAngle);
		const partsPerFullRing = C * ringSize;
		const partsPerArc = partsPerFullRing * (arcLength / (Math.PI * 2));
		
		const angleInc = (Math.PI * 2) / partsPerFullRing;
		const angleOffset = Math.random() * angleInc + startAngle;
		const maxRandomAngleOffset = angleInc * 0.33;
		
		for (let j = 0; j < partsPerArc; j++) {
			const randomAngleOffset = Math.random() * maxRandomAngleOffset;
			let angle = angleInc * j + angleOffset + randomAngleOffset;
			particleFactory(angle, ringSize);
		}
	}
}

function createParticleArc(start: number, arcLength: number, count: number, randomness: number, particleFactory: (angle: number) => void) {
	const angleDelta = arcLength / count;
	const end = start + arcLength - (angleDelta * 0.5);
	
	for (let angle = start; angle < end; angle += angleDelta) {
		particleFactory(angle + Math.random() * angleDelta * randomness);
	}
}

let lastTime = 0;
function animationLoop(frameTime: number) {
	if (!lastTime) lastTime = frameTime;
	const M_TO_S = 1000;
	const dt = (frameTime - lastTime) / M_TO_S;
	lastTime = frameTime;
	const lag = dt / (1/60);
	
	update(dt * M_TO_S, lag);
	
	animationFrameId = requestAnimationFrame(animationLoop);
}

function handleResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const containerW = Math.min(w, 7680);
    const containerH = w <= 420 ? h : Math.min(h, 4320);

    const trailsStage = new Stage('trails-canvas');
    const mainStage = new Stage('main-canvas');
    
    [trailsStage, mainStage].forEach(stage => stage.resize(containerW, containerH));

    stageW = containerW / scaleFactor;
    stageH = containerH / scaleFactor;
}

export function stopFireworks() {
	if (animationFrameId) {
		cancelAnimationFrame(animationFrameId);
		isPaused = true;
	}
	window.removeEventListener('resize', handleResize);
}

export function initFireworks() {
    if (typeof window === 'undefined') return;

    // Reset state for re-initialization
    lastTime = 0;
    isPaused = false;
    Star.active = createParticleCollection<StarState>();
    Spark.active = createParticleCollection<SparkState>();
    BurstFlash.active = [];

    handleResize();
    window.addEventListener('resize', handleResize);

    // Stop any previous loop
	stopFireworks();
    
    // Start new loop
	animationLoop(0);
}
