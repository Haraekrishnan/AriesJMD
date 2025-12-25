// This file is adapted from a CodePen by Caleb Miller.
// Original: https://codepen.io/MillerTime/pen/XgpNwb
// It has been converted to TypeScript and adapted for use in a React component.

// Type definitions
type Point = {
  x: number;
  y: number;
};

// Stage class for canvas management
export class Stage {
  static dpi = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1;
  static isHighDpi = Stage.dpi > 1;

  private canvas: HTMLCanvasElement;
  public ctx: CanvasRenderingContext2D;
  public width: number;
  public height: number;
  public dpr: number;

  constructor(canvasId: string) {
    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.width = this.canvas.width;
    this.height = this.canvas.height;
    this.dpr = Stage.dpi;
    this.resize(this.canvas.width, this.canvas.height);
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.dpr = Stage.isHighDpi ? 2 : 1; // Cap DPI at 2 for performance
    this.canvas.width = width * this.dpr;
    this.canvas.height = height * this.dpr;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.ctx.scale(this.dpr, this.dpr);
  }
}

// Fullscreen API helper
const fscreen = (() => {
    if (typeof document === 'undefined') {
        return {
            requestFullscreen: () => {},
            exitFullscreen: () => {},
            get fullscreenElement() { return null },
            get fullscreenEnabled() { return false },
            addEventListener: () => {},
            removeEventListener: () => {},
        }
    }
  let fscreen: any = {
    requestFullscreen: (element: any) => element.requestFullscreen(),
    exitFullscreen: () => document.exitFullscreen(),
    get fullscreenElement() { return document.fullscreenElement },
    get fullscreenEnabled() { return document.fullscreenEnabled },
    addEventListener: (type: string, handler: EventListenerOrEventListenerObject) => document.addEventListener(type, handler),
    removeEventListener: (type: string, handler: EventListenerOrEventListenerObject) => document.removeEventListener(type, handler),
  };
  
  const prefixes = ['', 'moz', 'webkit', 'ms'];
  for (const prefix of prefixes) {
    const p = prefix.toLowerCase();
    const requestFS = p + (p ? 'RequestFullscreen' : 'requestFullscreen');
    const exitFS = p + (p ? 'ExitFullscreen' : 'exitFullscreen');
    const elementFS = p + (p ? 'FullscreenElement' : 'fullscreenElement');
    const enabledFS = p + (p ? 'FullscreenEnabled' : 'fullscreenEnabled');
    
    if (document.documentElement.hasAttribute(requestFS)) {
      fscreen = {
        requestFullscreen: (element: any) => element[requestFS](),
        exitFullscreen: () => (document as any)[exitFS](),
        get fullscreenElement() { return (document as any)[elementFS] },
        get fullscreenEnabled() { return (document as any)[enabledFS] },
        addEventListener: (type: string, handler: EventListenerOrEventListenerObject) => document.addEventListener(prefix + type, handler),
        removeEventListener: (type: string, handler: EventListenerOrEventListenerObject) => document.removeEventListener(prefix + type, handler),
      };
      break;
    }
  }
  return fscreen;
})();

export { fscreen };
