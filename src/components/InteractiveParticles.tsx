import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  originX: number;
  originY: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  type: 'dot' | 'dash' | 'cross';
  angle: number;
  spin: number;
  alpha: number;
  maxDistance: number;
}

const COLORS = ['#0f172a', '#059669', '#7c3aed'];

export const InteractiveParticles: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const mouse = {
      x: -1000,
      y: -1000,
      radius: 140,
    };

    // Calculate number of particles based on screen resolution
    const particleCount = Math.min(80, Math.max(40, Math.floor((width * height) / 18000)));
    const particles: Particle[] = [];

    const createParticle = (): Particle => {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const typeChoice = Math.random();
      const type: 'dot' | 'dash' | 'cross' =
        typeChoice < 0.5 ? 'dot' : typeChoice < 0.85 ? 'dash' : 'cross';

      return {
        x,
        y,
        originX: x,
        originY: y,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        size: type === 'dot' ? Math.random() * 3 + 2 : Math.random() * 6 + 4,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        type,
        angle: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.02,
        alpha: Math.random() * 0.35 + 0.2,
        maxDistance: Math.random() * 120 + 80,
      };
    };

    for (let i = 0; i < particleCount; i++) {
      particles.push(createParticle());
    }

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    const handleMouseLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        // Natural gentle drift
        p.originX += p.vx;
        p.originY += p.vy;

        // Bounce from edges
        if (p.originX < 0 || p.originX > width) p.vx *= -1;
        if (p.originY < 0 || p.originY > height) p.vy *= -1;

        // Interaction physics (Antigravity repulsion from cursor)
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < mouse.radius && distance > 0) {
          const force = (mouse.radius - distance) / mouse.radius;
          const angle = Math.atan2(dy, dx);
          // Scatter repulsion
          const pushX = Math.cos(angle) * force * 12;
          const pushY = Math.sin(angle) * force * 12;
          p.x -= pushX;
          p.y -= pushY;
        } else {
          // Smooth spring return to floating origin
          p.x += (p.originX - p.x) * 0.05;
          p.y += (p.originY - p.y) * 0.05;
        }

        p.angle += p.spin;

        // Render geometric dash / dot / cross
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 1.5;

        if (p.type === 'dot') {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.type === 'dash') {
          ctx.beginPath();
          ctx.roundRect(-p.size / 2, -1, p.size, 2, 1);
          ctx.fill();
        } else if (p.type === 'cross') {
          const s = p.size / 2;
          ctx.beginPath();
          ctx.moveTo(-s, 0);
          ctx.lineTo(s, 0);
          ctx.moveTo(0, -s);
          ctx.lineTo(0, s);
          ctx.stroke();
        }

        ctx.restore();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[-1] w-full h-full"
    />
  );
};
