import { useEffect, useImperativeHandle, useRef, forwardRef } from 'react';

export interface ConfettiHandle {
  burst: (count?: number, originY?: number) => void;
  fireworks: () => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  vRot: number;
  life: number;
  maxLife: number;
  shape: 'rect' | 'circle';
}

const PARTY_COLORS = [
  '#FFD1DC',
  '#D4AF37',
  '#F48FB1',
  '#E6E6FA',
  '#E09F9D',
  '#F7E7CE',
  '#C25975',
];

export const ConfettiCanvas = forwardRef<ConfettiHandle>(function ConfettiCanvas(_props, ref) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number>(0);

  const startLoop = () => {
    if (rafRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const tick = () => {
      const particles = particlesRef.current;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.16;
        p.vx *= 0.992;
        p.rotation += p.vRot;
        p.life += 1;

        const alpha = Math.max(0, 1 - p.life / p.maxLife);
        if (alpha <= 0 || p.y > canvas.height + 40) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        if (p.shape === 'rect') {
          ctx.fillRect(-p.size * 0.5, -p.size * 0.3, p.size, p.size * 0.6);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 0.4, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      if (particles.length > 0) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        rafRef.current = 0;
      }
    };

    rafRef.current = requestAnimationFrame(tick);
  };

  useImperativeHandle(ref, () => ({
    burst(count = 95, originY = 0.38) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const cx = canvas.width * 0.5;
      const cy = canvas.height * originY;
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 3 + Math.random() * 10;
        particlesRef.current.push({
          x: cx + (Math.random() - 0.5) * 140,
          y: cy + (Math.random() - 0.5) * 40,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 4.5,
          size: 6 + Math.random() * 7,
          color: PARTY_COLORS[i % PARTY_COLORS.length],
          rotation: Math.random() * Math.PI * 2,
          vRot: (Math.random() - 0.5) * 0.2,
          life: 0,
          maxLife: 110 + Math.random() * 60,
          shape: i % 3 === 0 ? 'circle' : 'rect',
        });
      }
      startLoop();
    },
    fireworks() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const spots = [
        { x: 0.25, y: 0.3 },
        { x: 0.5, y: 0.22 },
        { x: 0.75, y: 0.32 },
      ];
      spots.forEach((spot, sIdx) => {
        window.setTimeout(() => {
          const ox = canvas.width * spot.x;
          const oy = canvas.height * spot.y;
          for (let i = 0; i < 65; i++) {
            const angle = (i / 65) * Math.PI * 2 + Math.random() * 0.15;
            const speed = 2.5 + Math.random() * 7.5;
            particlesRef.current.push({
              x: ox,
              y: oy,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed - 1.5,
              size: 5 + Math.random() * 6,
              color: PARTY_COLORS[(i + sIdx) % PARTY_COLORS.length],
              rotation: Math.random() * Math.PI * 2,
              vRot: (Math.random() - 0.5) * 0.18,
              life: 0,
              maxLife: 95 + Math.random() * 45,
              shape: i % 2 === 0 ? 'circle' : 'rect',
            });
          }
          startLoop();
        }, sIdx * 240);
      });
    },
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);
    return () => {
      window.removeEventListener('resize', resize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-50"
    />
  );
});
