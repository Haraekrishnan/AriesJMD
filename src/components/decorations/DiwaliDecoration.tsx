
'use client';
import React, { useEffect, useRef } from 'react';
import './diwali.css';
import { Stage, fscreen } from '@/lib/fireworks-animation';

export default function DiwaliDecoration() {
  const trailsCanvasRef = useRef<HTMLCanvasElement>(null);
  const mainCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    //
    // Constants
    //
    const IS_MOBILE = typeof window !== 'undefined' && window.innerWidth <= 640;
    const IS_DESKTOP = typeof window !== 'undefined' && window.innerWidth > 800;

    // Detect high end devices. This will be a moving target.
    const IS_HIGH_END_DEVICE = (() => {
      if (typeof navigator === 'undefined' || !navigator.hardwareConcurrency) {
        return false;
      }
      const hwConcurrency = navigator.hardwareConcurrency;
      // Large screens indicate a full size computer, which often have hyper threading these days.
      // So a quad core desktop machine has 8 cores. We'll place a higher min threshold there.
      const minCount = typeof window !== 'undefined' && window.innerWidth <= 1024 ? 4 : 8;
      return hwConcurrency >= minCount;
    })();

    const GRAVITY = 0.9; // Acceleration in px/s
    let simSpeed = 1;

    function getDefaultScaleFactor() {
      if (IS_MOBILE) return 0.9;
      return 1;
    }

    // Width/height values that take scale into account.
    // USE THESE FOR DRAWING POSITIONS
    let stageW: number, stageH: number;

    // All quality globals will be overwritten and updated via `configDidUpdate`.
    let quality = 1;
    let isLowQuality = false;
    let isNormalQuality = true;
    let isHighQuality = false;

    const QUALITY_LOW = 1;
    const QUALITY_NORMAL = 2;
    const QUALITY_HIGH = 3;

    const SKY_LIGHT_NONE = 0;
    const SKY_LIGHT_DIM = 1;
    const SKY_LIGHT_NORMAL = 2;

    const COLOR = {
      Red: '#ff0043',
      Green: '#14fc56',
      Blue: '#1e7fff',
      Purple: '#e60aff',
      Gold: '#ffbf36',
      White: '#ffffff'
    };

    // Special invisible color (not rendered, and therefore not in COLOR map)
    const INVISIBLE = '_INVISIBLE_';

    const PI_2 = Math.PI * 2;
    const PI_HALF = Math.PI * 0.5;

    // Stage.disableHighDPI = true;
    const trailsStage = new Stage('trails-canvas');
    const mainStage = new Stage('main-canvas');
    const stages = [
      trailsStage,
      mainStage
    ];



    // Fullscreen helpers, using Fscreen for prefixes.
    function fullscreenEnabled() {
      return fscreen.fullscreenEnabled;
    }

    // Note that fullscreen state is synced to store, and the store should be the source
    // of truth for whether the app is in fullscreen mode or not.
    function isFullscreen() {
      return !!fscreen.fullscreenElement;
    }

    // Attempt to toggle fullscreen mode.
    function toggleFullscreen() {
      if (fullscreenEnabled()) {
        if (isFullscreen()) {
          fscreen.exitFullscreen();
        } else {
          fscreen.requestFullscreen(document.documentElement);
        }
      }
    }

    // Simple state container; the source of truth.
    const store = {
      _listeners: new Set(),
      _dispatch(prevState: any) {
        this._listeners.forEach((listener: any)=> listener(this.state, prevState))
      },

      state: {
        // will be unpaused in init()
        paused: true,
        soundEnabled: false,
        menuOpen: false,
        openHelpTopic: null,
        fullscreen: isFullscreen(),
        // Note that config values used for <select>s must be strings, unless manually converting values to strings
        // at render time, and parsing on change.
        config: {
          quality: String(IS_HIGH_END_DEVICE ? QUALITY_HIGH : QUALITY_NORMAL), // will be mirrored to a global variable named `quality` in `configDidUpdate`, for perf.
          shell: 'Random',
          size: IS_DESKTOP
            ? '3' // Desktop default
            : '2', // Mobile default
          autoLaunch: true,
          finale: false,
          skyLighting: SKY_LIGHT_NORMAL + '',
          hideControls: true,
          longExposure: false,
          scaleFactor: getDefaultScaleFactor()
        }
      },

      setState(nextState: any) {
        const prevState = this.state;
        this.state = Object.assign({}, this.state, nextState);
        this._dispatch(prevState);
        this.persist();
      },

      subscribe(listener: any) {
        this._listeners.add(listener);
        return () => this._listeners.remove(listener);
      },

      // Load / persist select state to localStorage
      // Mutates state because `store.load()` should only be called once immediately after store is created, before any subscriptions.
      load() {
        const serializedData = localStorage.getItem('cm_fireworks_data');
        if (serializedData) {
          const {
            schemaVersion,
            data
          } = JSON.parse(serializedData);

          const config = this.state.config;
          switch (schemaVersion) {
            case '1.1':
              config.quality = data.quality;
              config.size = data.size;
              config.skyLighting = data.skyLighting;
              break;
            case '1.2':
              config.quality = data.quality;
              config.size = data.size;
              config.skyLighting = data.skyLighting;
              config.scaleFactor = data.scaleFactor;
              break;
            default:
              throw new Error('version switch should be exhaustive');
          }
          console.log(`Loaded config (schema version ${schemaVersion})`);
        }
        // Deprecated data format. Checked with care (it's not namespaced).
        else if (localStorage.getItem('schemaVersion') === '1') {
          let size;
          // Attempt to parse data, ignoring if there is an error.
          try {
            const sizeRaw = localStorage.getItem('configSize');
            size = typeof sizeRaw === 'string' && JSON.parse(sizeRaw);
          }
          catch (e) {
            console.log('Recovered from error parsing saved config:');
            console.error(e);
            return;
          }
          // Only restore validated values
          const sizeInt = parseInt(size, 10);
          if (sizeInt >= 0 && sizeInt <= 4) {
            this.state.config.size = String(sizeInt);
          }
        }
      },

      persist() {
        const config = this.state.config;
        localStorage.setItem('cm_fireworks_data', JSON.stringify({
          schemaVersion: '1.2',
          data: {
            quality: config.quality,
            size: config.size,
            skyLighting: config.skyLighting,
            scaleFactor: config.scaleFactor
          }
        }));
      }
    };

    // Actions
    // ---------

    function togglePause(toggle?: boolean) {
      const paused = store.state.paused;
      let newValue;
      if (typeof toggle === 'boolean') {
        newValue = toggle;
      } else {
        newValue = !paused;
      }

      if (paused !== newValue) {
        store.setState({ paused: newValue });
      }
    }


    // Map config to various properties & apply side effects
    function configDidUpdate() {
      const config = store.state.config;

      quality = qualitySelector();
      isLowQuality = quality === QUALITY_LOW;
      isNormalQuality = quality === QUALITY_NORMAL;
      isHighQuality = quality === QUALITY_HIGH;

      if (skyLightingSelector() === SKY_LIGHT_NONE) {
        if(appNodes.canvasContainer) appNodes.canvasContainer.style.backgroundColor = 'transparent';
      }

      Spark.drawWidth = quality === QUALITY_HIGH ? 0.75 : 1;
    }

    // Selectors
    // -----------

    const isRunning = (state = store.state) => !state.paused && !state.menuOpen;
    // Whether user has enabled sound.
    const soundEnabledSelector = (state = store.state) => state.soundEnabled;
    // Whether any sounds are allowed, taking into account multiple factors.
    const canPlaySoundSelector = (state = store.state) => isRunning(state) && soundEnabledSelector(state);
    // Convert quality to number.
    const qualitySelector = () => +store.state.config.quality;
    const shellNameSelector = () => store.state.config.shell;
    // Convert shell size to number.
    const shellSizeSelector = () => +store.state.config.size;
    const finaleSelector = () => store.state.config.finale;
    const skyLightingSelector = () => +store.state.config.skyLighting;
    const scaleFactorSelector = () => store.state.config.scaleFactor;



    // Help Content is not needed for this simplified implementation

    // Render app UI / keep in sync with state
    const appNodes: { [key: string]: HTMLElement | null } = {
        stageContainer: document.querySelector('.stage-container'),
        canvasContainer: document.querySelector('.canvas-container')
    };
    
    // Initial render is called in init()
    function renderApp(state: any) {
        if(appNodes.canvasContainer) {
            appNodes.canvasContainer.classList.toggle('blur', state.menuOpen);
        }
    }
    
    store.subscribe(renderApp);


    // Constant derivations
    const COLOR_NAMES = Object.keys(COLOR);
    const COLOR_CODES = COLOR_NAMES.map((colorName: string) => (COLOR as any)[colorName]);
    // Invisible stars need an indentifier, even through they won't be rendered - physics still apply.
    const COLOR_CODES_W_INVIS = [...COLOR_CODES, INVISIBLE];
    // Map of color codes to their index in the array. Useful for quickly determining if a color has already been updated in a loop.
    const COLOR_CODE_INDEXES = COLOR_CODES_W_INVIS.reduce((obj: any, code, i) => {
      obj[code] = i;
      return obj;
    }, {});
    // Tuples is a map keys by color codes (hex) with values of { r, g, b } tuples (still just objects).
    const COLOR_TUPLES: {[key: string]: {r: number, g: number, b: number}} = {};
    COLOR_CODES.forEach(hex => {
      COLOR_TUPLES[hex] = {
        r: parseInt(hex.substr(1, 2), 16),
        g: parseInt(hex.substr(3, 2), 16),
        b: parseInt(hex.substr(5, 2), 16),
      };
    });

    // Get a random color.
    function randomColorSimple() {
      return COLOR_CODES[Math.random() * COLOR_CODES.length | 0];
    }

    // Get a random color, with some customization options available.
    let lastColor: string;
    function randomColor(options?: { notSame?: boolean, notColor?: string, limitWhite?: boolean }) {
      const notSame = options && options.notSame;
      const notColor = options && options.notColor;
      const limitWhite = options && options.limitWhite;
      let color = randomColorSimple();

      // limit the amount of white chosen randomly
      if (limitWhite && color === COLOR.White && Math.random() < 0.6) {
        color = randomColorSimple();
      }

      if (notSame) {
        while (color === lastColor) {
          color = randomColorSimple();
        }
      }
      else if (notColor) {
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


    // Shell helpers
    function makePistilColor(shellColor: string) {
      return (shellColor === COLOR.White || shellColor === COLOR.Gold) ? randomColor({ notColor: shellColor }) : whiteOrGold();
    }

    // Unique shell types
    const crysanthemumShell = (size = 1) => {
      const glitter = Math.random() < 0.25;
      const singleColor = Math.random() < 0.72;
      const color = singleColor ? randomColor({ limitWhite: true }) : [randomColor(), randomColor({ notSame: true })];
      const pistil = singleColor && Math.random() < 0.42;
      const pistilColor = pistil && makePistilColor(color as string);
      const secondColor = singleColor && (Math.random() < 0.2 || color === COLOR.White) ? pistilColor || randomColor({ notColor: color as string, limitWhite: true }) : null;
      const streamers = !pistil && color !== COLOR.White && Math.random() < 0.42;
      let starDensity = glitter ? 1.1 : 1.25;
      if (isLowQuality) starDensity *= 0.8;
      if (isHighQuality) starDensity = 1.2;
      return {
        shellSize: size,
        spreadSize: 300 + size * 100,
        starLife: 900 + size * 200,
        starDensity,
        color,
        secondColor,
        glitter: glitter ? 'light' : '',
        glitterColor: whiteOrGold(),
        pistil,
        pistilColor,
        streamers
      };
    };

    function randomShell(size?: number) {
        return crysanthemumShell(size)
    }

    function shellFromConfig(size: number) {
      return crysanthemumShell(size);
    }

    function init() {
      // Begin simulation
      togglePause(false);

      // initial render
      renderApp(store.state);

      // Apply initial config
      configDidUpdate();
    }


    function fitShellPositionInBoundsH(position: number) {
      const edge = 0.18;
      return (1 - edge * 2) * position + edge;
    }

    function fitShellPositionInBoundsV(position: number) {
      return position * 0.75;
    }

    function getRandomShellPositionH() {
      return fitShellPositionInBoundsH(Math.random());
    }

    function getRandomShellPositionV() {
      return fitShellPositionInBoundsV(Math.random());
    }

    function getRandomShellSize() {
      const baseSize = shellSizeSelector();
      const maxVariance = Math.min(2.5, baseSize);
      const variance = Math.random() * maxVariance;
      const size = baseSize - variance;
      const height = maxVariance === 0 ? Math.random() : 1 - (variance / maxVariance);
      const centerOffset = Math.random() * (1 - height * 0.65) * 0.5;
      const x = Math.random() < 0.5 ? 0.5 - centerOffset : 0.5 + centerOffset;
      return {
        size,
        x: fitShellPositionInBoundsH(x),
        height: fitShellPositionInBoundsV(height)
      };
    }

    // Launches a shell from a user pointer event, based on state.config
    function launchShellFromConfig(event: PointerEvent) {
      const shell = new Shell(shellFromConfig(shellSizeSelector()));
      const w = mainStage.width;
      const h = mainStage.height;

      shell.launch(
        event ? event.x / w : getRandomShellPositionH(),
        event ? 1 - event.y / h : getRandomShellPositionV()
      );
    }


    // Sequences
    // -----------

    function seqRandomShell() {
      const size = getRandomShellSize();
      const shell = new Shell(shellFromConfig(size.size));
      shell.launch(size.x, size.height);

      let extraDelay = shell.starLife;
      if (shell.fallingLeaves) {
        extraDelay = 4600;
      }

      return 900 + Math.random() * 600 + extraDelay;
    }

    let isFirstSeq = true;
    const finaleCount = 32;
    let currentFinaleCount = 0;
    function startSequence() {
      if (isFirstSeq) {
        isFirstSeq = false;
          const shell = new Shell(crysanthemumShell(shellSizeSelector()));
          shell.launch(0.5, 0.5);
          return 2400;
      }

      if (finaleSelector()) {
        seqRandomShell();
        if (currentFinaleCount < finaleCount) {
          currentFinaleCount++;
          return 170;
        }
        else {
          currentFinaleCount = 0;
          return 6000;
        }
      }
      return seqRandomShell();
    }

    if (mainStage.canvas) {
        mainStage.canvas.addEventListener('pointerstart', launchShellFromConfig as EventListener);
    }

    // Account for window resize and custom scale changes.
    function handleResize() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        // Try to adopt screen size, heeding maximum sizes specified
        const MAX_WIDTH = 7680;
        const MAX_HEIGHT = 4320;
        const containerW = Math.min(w, MAX_WIDTH);
        const containerH = w <= 420 ? h : Math.min(h, MAX_HEIGHT);
        
        if (appNodes.stageContainer) {
            appNodes.stageContainer.style.width = containerW + 'px';
            appNodes.stageContainer.style.height = containerH + 'px';
        }
        stages.forEach(stage => stage.resize(containerW, containerH));
        const scaleFactor = scaleFactorSelector();
        stageW = containerW / scaleFactor;
        stageH = containerH / scaleFactor;
    }

    // Compute initial dimensions
    handleResize();

    window.addEventListener('resize', handleResize);


    // Dynamic globals
    let currentFrame = 0;
    let speedBarOpacity = 0;
    let autoLaunchTime = 0;
    let isUpdatingSpeed = false;

    // Extracted function to keep `update()` optimized
    function updateGlobals(timeStep: number, lag: number) {
      currentFrame++;

      // Always try to fade out speed bar
      if (!isUpdatingSpeed) {
        speedBarOpacity -= lag / 30; // half a second
        if (speedBarOpacity < 0) {
          speedBarOpacity = 0;
        }
      }

      // auto launch shells
      if (store.state.config.autoLaunch) {
        autoLaunchTime -= timeStep;
        if (autoLaunchTime <= 0) {
          autoLaunchTime = startSequence() * 1.25;
        }
      }
    }


    function update(frameTime: number, lag: number) {
      if (!isRunning()) return;

      const timeStep = frameTime * simSpeed;
      const speed = simSpeed * lag;

      updateGlobals(timeStep, lag);

      const starDrag = 1 - (1 - Star.airDrag) * speed;
      const starDragHeavy = 1 - (1 - Star.airDragHeavy) * speed;
      const sparkDrag = 1 - (1 - Spark.airDrag) * speed;
      const gAcc = timeStep / 1000 * GRAVITY;
      COLOR_CODES_W_INVIS.forEach(color => {
        // Stars
        const stars = Star.active[color];
        for (let i = stars.length - 1; i >= 0; i = i - 1) {
          const star = stars[i];
          // Only update each star once per frame. Since color can change, it's possible a star could update twice without this, leading to a "jump".
          if (star.updateFrame === currentFrame) {
            continue;
          }
          star.updateFrame = currentFrame;

          star.life -= timeStep;
          if (star.life <= 0) {
            stars.splice(i, 1);
            Star.returnInstance(star);
          } else {
            const burnRate = Math.pow(star.life / star.fullLife, 0.5);
            const burnRateInverse = 1 - burnRate;

            star.prevX = star.x;
            star.prevY = star.y;
            star.x += star.speedX * speed;
            star.y += star.speedY * speed;
            // Apply air drag if star isn't "heavy". The heavy property is used for the shell comets.
            if (!star.heavy) {
              star.speedX *= starDrag;
              star.speedY *= starDrag;
            }
            else {
              star.speedX *= starDragHeavy;
              star.speedY *= starDragHeavy;
            }
            star.speedY += gAcc;

            if (star.spinRadius) {
              star.spinAngle += star.spinSpeed * speed;
              star.x += Math.sin(star.spinAngle) * star.spinRadius * speed;
              star.y += Math.cos(star.spinAngle) * star.spinRadius * speed;
            }

            if (star.sparkFreq) {
              star.sparkTimer -= timeStep;
              while (star.sparkTimer < 0) {
                star.sparkTimer += star.sparkFreq * 0.75 + star.sparkFreq * burnRateInverse * 4;
                Spark.add(
                  star.x,
                  star.y,
                  star.sparkColor,
                  Math.random() * PI_2,
                  Math.random() * star.sparkSpeed * burnRate,
                  star.sparkLife * 0.8 + Math.random() * star.sparkLifeVariation * star.sparkLife
                );
              }
            }

            // Handle star transitions
            if (star.life < star.transitionTime) {
              if (star.secondColor && !star.colorChanged) {
                star.colorChanged = true;
                star.color = star.secondColor;
                stars.splice(i, 1);
                Star.active[star.secondColor].push(star);
                if (star.secondColor === INVISIBLE) {
                  star.sparkFreq = 0;
                }
              }

              if (star.strobe) {
                // Strobes in the following pattern: on:off:off:on:off:off in increments of `strobeFreq` ms.
                star.visible = Math.floor(star.life / star.strobeFreq) % 3 === 0;
              }
            }
          }
        }

        // Sparks
        const sparks = Spark.active[color];
        for (let i = sparks.length - 1; i >= 0; i = i - 1) {
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
    let lastFrameTime = performance.now();

    const currentSkyColor = { r: 0, g: 0, b: 0 };
    const targetSkyColor = { r: 0, g: 0, b: 0 };
    function colorSky(speed: number) {
      // The maximum r, g, or b value that will be used (255 would represent no maximum)
      const maxSkySaturation = skyLightingSelector() * 15;
      // How many stars are required in total to reach maximum sky brightness
      const maxStarCount = 500;
      let totalStarCount = 0;
      // Initialize sky as black
      targetSkyColor.r = 0;
      targetSkyColor.g = 0;
      targetSkyColor.b = 0;
      // Add each known color to sky, multiplied by particle count of that color. This will put RGB values wildly out of bounds, but we'll scale them back later.
      // Also add up total star count.
      COLOR_CODES.forEach(color => {
        const tuple = COLOR_TUPLES[color];
        const count = Star.active[color].length;
        totalStarCount += count;
        targetSkyColor.r += tuple.r * count;
        targetSkyColor.g += tuple.g * count;
        targetSkyColor.b += tuple.b * count;
      });

      // Clamp intensity at 1.0, and map to a custom non-linear curve. This allows few stars to perceivably light up the sky, while more stars continue to increase the brightness but at a lesser rate. This is more inline with humans' non-linear brightness perception.
      const intensity = Math.pow(Math.min(1, totalStarCount / maxStarCount), 0.3);
      // Figure out which color component has the highest value, so we can scale them without affecting the ratios.
      // Prevent 0 from being used, so we don't divide by zero in the next step.
      const maxColorComponent = Math.max(1, targetSkyColor.r, targetSkyColor.g, targetSkyColor.b);
      // Scale all color components to a max of `maxSkySaturation`, and apply intensity.
      targetSkyColor.r = targetSkyColor.r / maxColorComponent * maxSkySaturation * intensity;
      targetSkyColor.g = targetSkyColor.g / maxColorComponent * maxSkySaturation * intensity;
      targetSkyColor.b = targetSkyColor.b / maxColorComponent * maxSkySaturation * intensity;

      // Animate changes to color to smooth out transitions.
      const colorChange = 10;
      currentSkyColor.r += (targetSkyColor.r - currentSkyColor.r) / colorChange * speed;
      currentSkyColor.g += (targetSkyColor.g - currentSkyColor.g) / colorChange * speed;
      currentSkyColor.b += (targetSkyColor.b - currentSkyColor.b) / colorChange * speed;

      if(appNodes.canvasContainer) {
        appNodes.canvasContainer.style.backgroundColor = `rgba(${currentSkyColor.r | 0}, ${currentSkyColor.g | 0}, ${currentSkyColor.b | 0}, 0)`;
      }
    }

    function render(speed: number) {
      const { dpr } = mainStage;
      const width = stageW;
      const height = stageH;
      const trailsCtx = trailsStage.ctx;
      const mainCtx = mainStage.ctx;

      if (skyLightingSelector() !== SKY_LIGHT_NONE) {
        colorSky(speed);
      }

      // Account for high DPI screens, and custom scale factor.
      const scaleFactor = scaleFactorSelector();
      trailsCtx.scale(dpr * scaleFactor, dpr * scaleFactor);
      mainCtx.scale(dpr * scaleFactor, dpr * scaleFactor);

      trailsCtx.globalCompositeOperation = 'source-over';
      trailsCtx.fillStyle = `rgba(0, 0, 0, ${store.state.config.longExposure ? 0.0025 : 0.175 * speed})`;
      trailsCtx.fillRect(0, 0, width, height);

      mainCtx.clearRect(0, 0, width, height);

      // Draw queued burst flashes
      // These must also be drawn using source-over due to Safari. Seems rendering the gradients using lighten draws large black boxes instead.
      // Thankfully, these burst flashes look pretty much the same either way.
      while (BurstFlash.active.length) {
        const bf = BurstFlash.active.pop();

        const burstGradient = trailsCtx.createRadialGradient(bf.x, bf.y, 0, bf.x, bf.y, bf.radius);
        burstGradient.addColorStop(0.024, 'rgba(255, 255, 255, 1)');
        burstGradient.addColorStop(0.125, 'rgba(255, 160, 20, 0.2)');
        burstGradient.addColorStop(0.32, 'rgba(255, 140, 20, 0.11)');
        burstGradient.addColorStop(1, 'rgba(255, 120, 20, 0)');
        trailsCtx.fillStyle = burstGradient;
        trailsCtx.fillRect(bf.x - bf.radius, bf.y - bf.radius, bf.radius * 2, bf.radius * 2);

        BurstFlash.returnInstance(bf);
      }

      // Remaining drawing on trails canvas will use 'lighten' blend mode
      trailsCtx.globalCompositeOperation = 'lighten';

      // Draw stars
      trailsCtx.lineWidth = Star.drawWidth;
      trailsCtx.lineCap = isLowQuality ? 'square' : 'round';
      mainCtx.strokeStyle = '#fff';
      mainCtx.lineWidth = 1;
      mainCtx.beginPath();
      COLOR_CODES.forEach(color => {
        const stars = Star.active[color];
        trailsCtx.strokeStyle = color;
        trailsCtx.beginPath();
        stars.forEach(star => {
          if (star.visible) {
            trailsCtx.moveTo(star.x, star.y);
            trailsCtx.lineTo(star.prevX, star.prevY);
            mainCtx.moveTo(star.x, star.y);
            mainCtx.lineTo(star.x - star.speedX * 1.6, star.y - star.speedY * 1.6);
          }
        });
        trailsCtx.stroke();
      });
      mainCtx.stroke();

      // Draw sparks
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

      // Render speed bar if visible
      if (speedBarOpacity) {
        const speedBarHeight = 6;
        mainCtx.globalAlpha = speedBarOpacity;
        mainCtx.fillStyle = COLOR.Blue;
        mainCtx.fillRect(0, height - speedBarHeight, width * simSpeed, speedBarHeight);
        mainCtx.globalAlpha = 1;
      }


      trailsCtx.setTransform(1, 0, 0, 1, 0, 0);
      mainCtx.setTransform(1, 0, 0, 1, 0, 0);
    }
    
    // Helper to generate objects for storing active particles.
    // Particles are stored in arrays keyed by color (code, not name) for improved rendering performance.
    function createParticleCollection() {
      const collection: { [key: string]: any[] } = {};
      COLOR_CODES_W_INVIS.forEach(color => {
        collection[color] = [];
      });
      return collection;
    }

    const BurstFlash = {
        active: [] as any[],
        _pool: [] as any[],
    
        _new() {
            return {}
        },
    
        add(x: number, y: number, radius: number) {
            const instance: any = this._pool.pop() || this._new();
    
            instance.x = x;
            instance.y = y;
            instance.radius = radius;
    
            this.active.push(instance);
            return instance;
        },
    
        returnInstance(instance: any) {
            this._pool.push(instance);
        }
    };

    const Star = {
      // Visual properties
      drawWidth: 3,
      airDrag: 0.98,
      airDragHeavy: 0.992,

      // Star particles will be keyed by color
      active: createParticleCollection(),
      _pool: [] as any[],

      _new(): any {
        return {};
      },

      add(x: number, y: number, color: string, angle: number, speed: number, life: number, speedOffX?: number, speedOffY?: number) {
        const instance = this._pool.pop() || this._new();

        instance.visible = true;
        instance.heavy = false;
        instance.x = x;
        instance.y = y;
        instance.prevX = x;
        instance.prevY = y;
        instance.color = color;
        instance.speedX = Math.sin(angle) * speed + (speedOffX || 0);
        instance.speedY = Math.cos(angle) * speed + (speedOffY || 0);
        instance.life = life;
        instance.fullLife = life;
        instance.spinAngle = Math.random() * PI_2;
        instance.spinSpeed = 0.8;
        instance.spinRadius = 0;
        instance.sparkFreq = 0; // ms between spark emissions
        instance.sparkSpeed = 1;
        instance.sparkTimer = 0;
        instance.sparkColor = color;
        instance.sparkLife = 750;
        instance.sparkLifeVariation = 0.25;
        instance.strobe = false;

        this.active[color].push(instance);
        return instance;
      },

      // Public method for cleaning up and returning an instance back to the pool.
      returnInstance(instance: any) {
        // Call onDeath handler if available (and pass it current star instance)
        instance.onDeath && instance.onDeath(instance);
        // Clean up
        instance.onDeath = null;
        instance.secondColor = null;
        instance.transitionTime = 0;
        instance.colorChanged = false;
        // Add back to the pool.
        this._pool.push(instance);
      }
    };


    const Spark = {
      // Visual properties
      drawWidth: 0, // set in `configDidUpdate()`
      airDrag: 0.9,

      // Star particles will be keyed by color
      active: createParticleCollection(),
      _pool: [] as any[],

      _new() {
        return {};
      },

      add(x: number, y: number, color: string, angle: number, speed: number, life: number) {
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

      // Public method for cleaning up and returning an instance back to the pool.
      returnInstance(instance: any) {
        // Add back to the pool.
        this._pool.push(instance);
      }
    };
    
    function createBurst(count: number, particleFactory: (angle: number, speedMult: number) => void, startAngle=0, arcLength=PI_2) {
      // Assuming sphere with surface area of `count`, calculate various
      // properties of said sphere (unit is stars).
      // Radius
      const R = 0.5 * Math.sqrt(count/Math.PI);
      // Circumference
      const C = 2 * R * Math.PI;
      // Half Circumference
      const C_HALF = C / 2;
      
      // Make a series of rings, sizing them as if they were spaced evenly
      // along the curved surface of a sphere.
      for (let i=0; i<=C_HALF; i++) {
        const ringAngle = i / C_HALF * PI_HALF;
        const ringSize = Math.cos(ringAngle);
        const partsPerFullRing = C * ringSize;
        const partsPerArc = partsPerFullRing * (arcLength / PI_2);
        
        const angleInc = PI_2 / partsPerFullRing;
        const angleOffset = Math.random() * angleInc + startAngle;
        // Each particle needs a bit of randomness to improve appearance.
        const maxRandomAngleOffset = angleInc * 0.33;
        
        for (let i=0; i<partsPerArc; i++) {
          const randomAngleOffset = Math.random() * maxRandomAngleOffset;
          let angle = angleInc * i + angleOffset + randomAngleOffset;
          particleFactory(angle, ringSize);
        }
      }
    }

    class Shell {
        [key: string]: any;
        constructor(options: any) {
          Object.assign(this, options);
          this.starLifeVariation = options.starLifeVariation || 0.125;
          this.color = options.color || randomColor();
          this.glitterColor = options.glitterColor || this.color;
                  
          // Set default starCount if needed, will be based on shell size and scale exponentially, like a sphere's surface area.
          if (!this.starCount) {
              const density = options.starDensity || 1;
              const scaledSize = this.spreadSize / 54;
              this.starCount = Math.max(6, scaledSize * scaledSize * density);
          }
        }
        
        launch(position: number, launchHeight: number) {
          const width = stageW;
          const height = stageH;
          // Distance from sides of screen to keep shells.
          const hpad = 60;
          // Distance from top of screen to keep shell bursts.
          const vpad = 50;
          // Minimum burst height, as a percentage of stage height
          const minHeightPercent = 0.45;
          // Minimum burst height in px
          const minHeight = height - height * minHeightPercent;
          
          const launchX = position * (width - hpad * 2) + hpad;
          const launchY = height;
          const burstY = minHeight - (launchHeight * (minHeight - vpad));
          
          const launchDistance = launchY - burstY;
          // Using a custom power curve to approximate Vi needed to reach launchDistance under gravity and air drag.
          // Magic numbers came from testing.
          const launchVelocity = Math.pow(launchDistance * 0.04, 0.64);
          
          const comet = this.comet = Star.add(
              launchX,
              launchY,
              typeof this.color === 'string' && this.color !== 'random' ? this.color : COLOR.White,
              Math.PI,
              launchVelocity * (this.horsetail ? 1.2 : 1),
              // Hang time is derived linearly from Vi; exact number came from testing
              launchVelocity * (this.horsetail ? 100 : 400)
          );
          
          // making comet "heavy" limits air drag
          comet.heavy = true;
          // comet spark trail
          comet.spinRadius = Math.random() * 0.32 + 0.85;
          comet.sparkFreq = 32 / quality;
          if (isHighQuality) comet.sparkFreq = 8;
          comet.sparkLife = 320;
          comet.sparkLifeVariation = 3;
          if (this.glitter === 'willow' || this.fallingLeaves) {
              comet.sparkFreq = 20 / quality;
              comet.sparkSpeed = 0.5;
              comet.sparkLife = 500;
          }
          if (this.color === INVISIBLE) {
              comet.sparkColor = COLOR.Gold;
          }
          
          // Randomly make comet "burn out" a bit early.
          // This is disabled for horsetail shells, due to their very short airtime.
          if (Math.random() > 0.4 && !this.horsetail) {
              comet.secondColor = INVISIBLE;
              comet.transitionTime = Math.pow(Math.random(), 1.5) * 700 + 500;
          }
          
          comet.onDeath = (comet: any) => this.burst(comet.x, comet.y);
        }
        
        burst(x: number, y: number) {
          // Set burst speed so overall burst grows to set size. This specific formula was derived from testing, and is affected by simulated air drag.
          const speed = this.spreadSize / 96;
      
          let color: any, onDeath: any, sparkFreq: any, sparkSpeed: any, sparkLife: any;
          let sparkLifeVariation = 0.25;
          
          // Star factory for primary burst, pistils, and streamers.
          const starFactory = (angle: number, speedMult: number) => {
              // For non-horsetail shells, compute an initial vertical speed to add to star burst.
              // The magic number comes from testing what looks best. The ideal is that all shell
              // bursts appear visually centered for the majority of the star life (excl. willows etc.)
              const standardInitialSpeed = this.spreadSize / 1800;
              
              const star = Star.add(
                  x,
                  y,
                  color || randomColor(),
                  angle,
                  speedMult * speed,
                  // add minor variation to star life
                  this.starLife + Math.random() * this.starLife * this.starLifeVariation,
                  this.horsetail ? this.comet && this.comet.speedX : 0,
                  this.horsetail ? this.comet && this.comet.speedY : -standardInitialSpeed
              );
      
              if (this.secondColor) {
                  star.transitionTime = this.starLife * (Math.random() * 0.05 + 0.32);
                  star.secondColor = this.secondColor;
              }
      
              if (this.strobe) {
                  star.transitionTime = this.starLife * (Math.random() * 0.08 + 0.46);
                  star.strobe = true;
                  // How many milliseconds between switch of strobe state "tick". Note that the strobe pattern
                  // is on:off:off, so this is the "on" duration, while the "off" duration is twice as long.
                  star.strobeFreq = Math.random() * 20 + 40;
                  if (this.strobeColor) {
                      star.secondColor = this.strobeColor;
                  }
              }
              
              star.onDeath = onDeath;
      
              if (this.glitter) {
                  star.sparkFreq = sparkFreq;
                  star.sparkSpeed = sparkSpeed;
                  star.sparkLife = sparkLife;
                  star.sparkLifeVariation = sparkLifeVariation;
                  star.sparkColor = this.glitterColor;
                  star.sparkTimer = Math.random() * star.sparkFreq;
              }
          };
          
          
          if (typeof this.color === 'string') {
              if (this.color === 'random') {
                  color = null; // falsey value creates random color in starFactory
              } else {
                  color = this.color;
              }
              createBurst(this.starCount, starFactory);
          }
          
          BurstFlash.add(x, y, this.spreadSize / 4);
        }
      }

    let ticker: number;
    function mainLoop(time: number) {
      if(typeof lastFrameTime === 'undefined') {
        lastFrameTime = performance.now();
      }
      const lag = time - lastFrameTime;
      lastFrameTime = time;
      update(time, lag);
      ticker = requestAnimationFrame(mainLoop);
    }
    init();
    mainLoop(performance.now());
    
    return () => {
      if (mainStage.canvas) {
        mainStage.canvas.removeEventListener('pointerstart', launchShellFromConfig as EventListener);
      }
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(ticker);
    }
  }, []);

  return (
    <div className="diwali-container">
      <div className="happy-diwali">
        <h1>Happy Diwali</h1>
      </div>
      <div className="diya-container">
        <div className="diya">
          <div className="flame"></div>
        </div>
        <div className="diya">
          <div className="flame"></div>
        </div>
        <div className="diya">
          <div className="flame"></div>
        </div>
      </div>
      <div className="stage-container">
        <div className="canvas-container">
          <canvas id="trails-canvas" ref={trailsCanvasRef}></canvas>
          <canvas id="main-canvas" ref={mainCanvasRef}></canvas>
        </div>
      </div>
    </div>
  );
}
