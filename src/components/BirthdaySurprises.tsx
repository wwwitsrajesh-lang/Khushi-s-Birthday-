import { useEffect, useRef, useState } from 'react';
import { Gift } from 'lucide-react';

interface ScratchCardItem {
  id: string;
  label: string;
  title: string;
  blessing: string;
  surfaceTint: string;
}

const SCRATCH_CARDS: ScratchCardItem[] = [
  {
    id: 'scratch-1',
    label: 'Surprise 01',
    title: 'A Magical Year 11 of Khushi',
    blessing:
      'May age 11 bring you giant giggles, awesome adventures, shining school days, and sweet surprises around every corner!',
    surfaceTint: '#FFE8F4',
  },
  {
    id: 'scratch-2',
    label: 'Surprise 02',
    title: 'Princess Treat & Ice Cream Pass',
    blessing:
      'Redeemable anytime for your favorite ice cream sundae, extra family hugs, and a cozy movie night where you pick the movie!',
    surfaceTint: '#F3EBFF',
  },
  {
    id: 'scratch-3',
    label: 'Surprise 03',
    title: 'Superstar Dreams Come True',
    blessing:
      'Keep dreaming big, painting bright, and sparkling boldly—your whole family is your #1 fan club forever!',
    surfaceTint: '#FFF7DC',
  },
];

interface FlipCardItem {
  id: string;
  number: string;
  frontTitle: string;
  frontSubtitle: string;
  backText: string;
  gradientClass: string;
  accentColor: string;
  crestKind: 'crown' | 'cake' | 'peony' | 'candle';
}

const ADORE_CARDS: FlipCardItem[] = [
  {
    id: 'adore-1',
    number: '01',
    frontTitle: 'Our Birthday Princess',
    frontSubtitle: 'Sparkle of every room',
    backText:
      'You walk into any room and light it up like fairy lights—your giggles and radiant smile make everyone’s day brighter!',
    gradientClass: 'from-[#FFEAF5] via-[#FFD8EC] to-[#FFF2DA]',
    accentColor: '#D81E78',
    crestKind: 'crown',
  },
  {
    id: 'adore-2',
    number: '02',
    frontTitle: 'Sweetest Khushi Mama',
    frontSubtitle: 'Best stories & fun times',
    backText:
      'So playful, creative, and full of fun ideas—every family game, craft, and treat is ten times better with you!',
    gradientClass: 'from-[#F5ECFF] via-[#E8D8FF] to-[#FFEAF5]',
    accentColor: '#7C3AED',
    crestKind: 'cake',
  },
  {
    id: 'adore-3',
    number: '03',
    frontTitle: 'Kindest Big Heart',
    frontSubtitle: 'Caring in every little way',
    backText:
      'At 11 years old you already have the sweetest, most caring heart—always making everyone around you feel loved.',
    gradientClass: 'from-[#E9FBFF] via-[#D4F6FD] to-[#F5ECFF]',
    accentColor: '#0E7C90',
    crestKind: 'peony',
  },
  {
    id: 'adore-4',
    number: '04',
    frontTitle: '20th November Star',
    frontSubtitle: 'Turning 11 in style!',
    backText:
      'Every November 20th reminds us how lucky our home is to celebrate our shining star Simran growing brighter every year!',
    gradientClass: 'from-[#FFF9DF] via-[#FFECB8] to-[#FFE6F2]',
    accentColor: '#B45309',
    crestKind: 'candle',
  },
];

function CoverCrest({ kind, accent }: { kind: FlipCardItem['crestKind']; accent: string }) {
  if (kind === 'crown') {
    return (
      <svg viewBox="0 0 64 64" className="w-12 h-12" fill="none" aria-hidden="true">
        <circle cx="32" cy="32" r="28" stroke="#F5B82E" strokeOpacity="0.6" strokeWidth="1.4" strokeDasharray="3 3" />
        <path
          d="M16 40L19 23L27.5 31L32 19L36.5 31L45 23L48 40H16Z"
          fill={accent}
          fillOpacity="0.18"
          stroke={accent}
          strokeWidth="1.9"
          strokeLinejoin="round"
        />
        <rect x="16" y="42" width="32" height="4" rx="2" fill="#F5B82E" />
        <circle cx="32" cy="17" r="2.4" fill="#F5B82E" />
        <circle cx="19" cy="21" r="2" fill="#FF4FA6" />
        <circle cx="45" cy="21" r="2" fill="#FF4FA6" />
      </svg>
    );
  }
  if (kind === 'cake') {
    return (
      <svg viewBox="0 0 64 64" className="w-12 h-12" fill="none" aria-hidden="true">
        <circle cx="32" cy="32" r="28" stroke="#F5B82E" strokeOpacity="0.6" strokeWidth="1.4" strokeDasharray="3 3" />
        <rect x="17" y="34" width="30" height="12" rx="3" fill={accent} fillOpacity="0.18" stroke={accent} strokeWidth="1.9" />
        <rect x="22" y="25" width="20" height="9" rx="2.5" fill="#FF4FA6" fillOpacity="0.24" stroke="#FF4FA6" strokeWidth="1.6" />
        <line x1="27" y1="18" x2="27" y2="25" stroke={accent} strokeWidth="1.9" strokeLinecap="round" />
        <line x1="37" y1="18" x2="37" y2="25" stroke={accent} strokeWidth="1.9" strokeLinecap="round" />
        <circle cx="27" cy="15" r="2.2" fill="#FF922B" />
        <circle cx="37" cy="15" r="2.2" fill="#FFD84D" />
        <path d="M13 46H51" stroke={accent} strokeWidth="1.9" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === 'peony') {
    return (
      <svg viewBox="0 0 64 64" className="w-12 h-12" fill="none" aria-hidden="true">
        <circle cx="32" cy="32" r="28" stroke="#F5B82E" strokeOpacity="0.6" strokeWidth="1.4" strokeDasharray="3 3" />
        <path
          d="M32 20C36 20 39 24 39 28C43 28 46 31 46 35C46 39 42 42 38 42C36 45 28 45 26 42C22 42 18 39 18 35C18 31 21 28 25 28C25 24 28 20 32 20Z"
          fill={accent}
          fillOpacity="0.18"
          stroke={accent}
          strokeWidth="1.8"
        />
        <circle cx="32" cy="33" r="5" fill="#FFD84D" fillOpacity="0.6" stroke="#F5B82E" strokeWidth="1.5" />
        <path d="M32 45V51" stroke={accent} strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 64 64" className="w-12 h-12" fill="none" aria-hidden="true">
      <circle cx="32" cy="32" r="28" stroke="#F5B82E" strokeOpacity="0.6" strokeWidth="1.4" strokeDasharray="3 3" />
      <path
        d="M32 14L34.4 21.6L42 24L34.4 26.4L32 34L29.6 26.4L22 24L29.6 21.6L32 14Z"
        fill="#FFD84D"
        fillOpacity="0.55"
        stroke="#F59F00"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <rect x="26" y="36" width="12" height="12" rx="2" fill={accent} fillOpacity="0.2" stroke={accent} strokeWidth="1.7" />
      <path d="M22 48H42" stroke={accent} strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

function ScratchBlessingCard({
  card,
  forceRevealed,
  onRevealed,
}: {
  card: ScratchCardItem;
  forceRevealed: boolean;
  onRevealed: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [revealed, setRevealed] = useState(false);
  const isDrawingRef = useRef(false);
  const scratchedPixelsRef = useRef(0);

  useEffect(() => {
    if (forceRevealed) {
      setRevealed(true);
    }
  }, [forceRevealed]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = 360;
    const h = 210;
    canvas.width = w;
    canvas.height = h;

    // Sparkling pink-gold-lavender glitter foil for an 11-year-old birthday surprise
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#FF62AF');
    grad.addColorStop(0.5, '#F9D66B');
    grad.addColorStop(1, '#B882FF');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Draw tiny sparkle stars & glitter dots across the foil
    for (let i = 0; i < 42; i++) {
      const sx = Math.random() * w;
      const sy = Math.random() * h;
      const r = 2 + Math.random() * 5;
      ctx.fillStyle = i % 3 === 0 ? 'rgba(255, 255, 255, 0.55)' : 'rgba(255, 248, 220, 0.34)';
      if (i % 4 === 0) {
        ctx.beginPath();
        ctx.moveTo(sx, sy - r * 1.4);
        ctx.lineTo(sx + r * 0.4, sy - r * 0.4);
        ctx.lineTo(sx + r * 1.4, sy);
        ctx.lineTo(sx + r * 0.4, sy + r * 0.4);
        ctx.lineTo(sx, sy + r * 1.4);
        ctx.lineTo(sx - r * 0.4, sy + r * 0.4);
        ctx.lineTo(sx - r * 1.4, sy);
        ctx.lineTo(sx - r * 0.4, sy - r * 0.4);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(sx, sy, r * 0.65, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.fillStyle = '#2D242C';
    ctx.font = '700 15px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('✦ Scratch here to reveal ✦', w / 2, h / 2 - 4);
    ctx.font = '600 12px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(card.label, w / 2, h / 2 + 18);
  }, [card.label]);

  const scratchAt = (clientX: number, clientY: number) => {
    if (revealed) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.fill();

    scratchedPixelsRef.current += 1;
    if (scratchedPixelsRef.current > 24) {
      setRevealed(true);
      onRevealed();
    }
  };

  return (
    <div
      className="relative h-52 rounded-2xl border-2 border-[#F3CEE0] overflow-hidden shadow-xs p-6 flex flex-col justify-center text-center select-none"
      style={{ backgroundColor: card.surfaceTint }}
    >
      <p className="text-xs font-semibold uppercase tracking-widest text-[#D81E78] mb-1">
        {card.label}
      </p>
      <h3 className="font-serif-display text-xl font-bold text-[#2D242C] mb-2">
        {card.title}
      </h3>
      <p className="text-sm text-[#4A3B48] leading-relaxed">{card.blessing}</p>

      <canvas
        ref={canvasRef}
        onPointerDown={(e) => {
          isDrawingRef.current = true;
          scratchAt(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (isDrawingRef.current) scratchAt(e.clientX, e.clientY);
        }}
        onPointerUp={() => {
          isDrawingRef.current = false;
        }}
        onPointerLeave={() => {
          isDrawingRef.current = false;
        }}
        className={`absolute inset-0 w-full h-full touch-none cursor-grab active:cursor-grabbing transition-opacity duration-500 ${
          revealed ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      />
    </div>
  );
}

interface BirthdaySurprisesProps {
  onCelebrate: () => void;
}

export function BirthdaySurprises({ onCelebrate }: BirthdaySurprisesProps) {
  const [revealAll, setRevealAll] = useState(false);
  const [flippedIds, setFlippedIds] = useState<Record<string, boolean>>({});

  return (
    <section id="surprises" className="py-16 sm:py-24 px-4 sm:px-8 max-w-6xl mx-auto">
      {/* Scratch-Off Blessings */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#D81E78] mb-2">
            Sparkly Glitter Scratch-Off Surprises
          </p>
          <h2 className="font-fancy text-2xl sm:text-4xl font-bold text-[#2D242C]">
            Three 11th Birthday Surprises for Simran
          </h2>
        </div>
        <button
          type="button"
          onClick={() => {
            setRevealAll(true);
            onCelebrate();
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-[#F3CEE0] text-xs font-semibold text-[#2D242C] hover:bg-[#FFF0F7] transition-colors cursor-pointer w-fit whitespace-nowrap"
        >
          <Gift className="w-3.5 h-3.5 text-[#D81E78]" />
          <span>Reveal All Cards</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
        {SCRATCH_CARDS.map((card) => (
          <ScratchBlessingCard
            key={card.id}
            card={card}
            forceRevealed={revealAll}
            onRevealed={onCelebrate}
          />
        ))}
      </div>

      {/* 3D Flip-Cards: Why Everyone Adores Khushi */}
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#D81E78] mb-2">
          Magical Flip-Card Keepsakes
        </p>
        <h2 className="font-fancy text-2xl sm:text-4xl font-bold text-[#2D242C]">
          Why Everyone Adores Our 11-Year-Old Star
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {ADORE_CARDS.map((card) => {
          const isFlipped = Boolean(flippedIds[card.id]);
          return (
            <button
              key={card.id}
              type="button"
              onClick={() =>
                setFlippedIds((prev) => ({ ...prev, [card.id]: !prev[card.id] }))
              }
              className={`flip-card h-64 w-full text-left cursor-pointer ${
                isFlipped ? 'is-flipped' : ''
              }`}
            >
              <div className="flip-card-inner">
                {/* Ornate Storybook-Cover Front */}
                <div
                  className={`flip-card-front relative rounded-2xl bg-gradient-to-br ${card.gradientClass} border border-[#F3CEE0] p-6 flex flex-col justify-between shadow-sm overflow-hidden`}
                >
                  {/* Delicate inner gilt frame */}
                  <div
                    className="pointer-events-none absolute inset-2.5 rounded-xl border border-[#F5B82E]/50"
                    aria-hidden="true"
                  />

                  <div className="relative z-10 flex items-start justify-between">
                    <span
                      className="font-editorial italic text-lg font-semibold tabular-nums"
                      style={{ color: card.accentColor }}
                    >
                      {card.number}
                    </span>
                    <CoverCrest kind={card.crestKind} accent={card.accentColor} />
                  </div>

                  <div className="relative z-10">
                    <p className="font-editorial italic text-sm text-[#4A3B48] mb-0.5">
                      {card.frontSubtitle}
                    </p>
                    <h3 className="font-fancy text-lg font-bold text-[#2D242C] leading-snug">
                      {card.frontTitle}
                    </h3>
                    <div className="mt-3 pt-2.5 border-t border-[#F5B82E]/35 flex items-center justify-between text-[11px] font-semibold tracking-wide text-[#4A3B48]">
                      <span>Tap or hover to flip</span>
                      <span style={{ color: card.accentColor }}>&rarr;</span>
                    </div>
                  </div>
                </div>

                {/* Back */}
                <div className="flip-card-back relative rounded-2xl bg-gradient-to-br from-[#3D1D47] via-[#4D1E57] to-[#2D1A36] text-[#FFFDF9] p-6 flex flex-col justify-between shadow-md">
                  <div
                    className="pointer-events-none absolute inset-2.5 rounded-xl border border-[#FFD84D]/40"
                    aria-hidden="true"
                  />
                  <span className="font-editorial italic text-sm text-[#FFD84D]">
                    {card.number} &middot; {card.frontTitle}
                  </span>
                  <p className="font-editorial italic text-lg leading-relaxed text-[#FFF3FA]">
                    &ldquo;{card.backText}&rdquo;
                  </p>
                  <span className="text-[11px] font-medium text-[#FFD84D]/85">
                    Tap to flip back
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
