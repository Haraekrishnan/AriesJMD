
'use client';
import React, { useEffect, useRef, useState } from 'react';
import './diwali.css';

// Type definitions for the firework simulation
type Vector = {
  x: number;
  y: number;
};

type Firework = {
  x: number;
  y: number;
  xTo: number;
  yTo: number;
  size: number;
  trail: Particle[];
  update: () => boolean;
  draw: (ctx: CanvasRenderingContext2D) => void;
};

type Particle = {
  x: number;
  y: number;
  xTo: number;
  yTo: number;
  size: number;
  life: number;
  update: () => boolean;
  draw: (ctx: CanvasRenderingContext2D) => void;
};

// Main Component
export default function DiwaliDecoration() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRunning, setIsRunning] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width: number, height: number;
    let fireworks: Firework[] = [];
    let particles: Particle[] = [];
    let animationFrameId: number;

    const resizeCanvas = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };

    const createParticle = (x: number, y: number, size: number, angle: number): Particle => {
      const speed = Math.random() * 4 + 2;
      return {
        x,
        y,
        xTo: Math.cos(angle) * speed,
        yTo: Math.sin(angle) * speed,
        size,
        life: Math.random() * 10 + 30,
        update: function() {
          this.x += this.xTo;
          this.y += this.yTo;
          this.life--;
          return this.life > 0;
        },
        draw: function(ctx: CanvasRenderingContext2D) {
          ctx.fillStyle = `hsl(${Math.random() * 360}, 100%, 50%)`;
          ctx.beginPath();
          ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
          ctx.fill();
        }
      };
    };

    const createFirework = (): Firework => {
      const x = width * (Math.random() * 0.8 + 0.1);
      const y = height;
      const xTo = (Math.random() - 0.5) * 4;
      const yTo = -(Math.random() * 10 + 15);
      const size = 2;
      const trail: Particle[] = [];

      const explode = (firework: Firework) => {
        const numParticles = 100;
        for (let i = 0; i < numParticles; i++) {
          const angle = Math.random() * Math.PI * 2;
          particles.push(createParticle(firework.x, firework.y, 2, angle));
        }
      };

      return {
        x,
        y,
        xTo,
        yTo,
        size,
        trail,
        update: function() {
          if (this.yTo > 0) {
            explode(this);
            return false;
          }
          this.x += this.xTo;
          this.y += this.yTo;
          this.yTo += 0.2;
          this.trail.push(createParticle(this.x, this.y, this.size, Math.random() * Math.PI * 2));
          while (this.trail.length > 10) this.trail.shift();
          return true;
        },
        draw: function(ctx: CanvasRenderingContext2D) {
          ctx.fillStyle = '#FFF';
          ctx.beginPath();
          ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
          ctx.fill();
          this.trail.forEach(p => p.draw(ctx));
        }
      };
    };
    
    const loop = () => {
      if (!ctx) return;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.fillRect(0, 0, width, height);

      if (Math.random() < 0.05) {
        fireworks.push(createFirework());
      }

      fireworks = fireworks.filter(f => f.update());
      particles = particles.filter(p => p.update());

      fireworks.forEach(f => f.draw(ctx));
      particles.forEach(p => p.draw(ctx));

      animationFrameId = requestAnimationFrame(loop);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    animationFrameId = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="diwali-container">
        <div className="happy-diwali">
            <h1>Happy Diwali</h1>
        </div>
        <div className="canvas-container">
            <canvas ref={canvasRef}></canvas>
        </div>
    </div>
  );
}
