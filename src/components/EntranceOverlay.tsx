import { Sparkles } from 'lucide-react';

interface EntranceOverlayProps {
  visible: boolean;
  onEnter: (withMusic: boolean) => void;
}

export function EntranceOverlay({ visible, onEnter }: EntranceOverlayProps) {
  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="11th Birthday Surprise Entrance for Simran"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gradient-to-br from-[#FFE0F2] via-[#FFF6D6] to-[#E6DBFF]"
    >
      <div className="relative max-w-lg w-full rounded-3xl bg-[#FFFDF9]/95 border-2 border-[#F5CBE0] p-8 sm:p-11 text-center shadow-2xl">
        {/* Festive Rainbow Bunting Garland */}
        <svg viewBox="0 0 400 36" className="w-full h-7 mb-3 pointer-events-none" aria-hidden="true">
          <path d="M0 4 Q200 22 400 4" fill="none" stroke="#F5B82E" strokeWidth="1.6" />
          <polygon points="24,6 44,8 33,24" fill="#FF4FA6" />
          <polygon points="68,10 88,11 77,27" fill="#FFD84D" />
          <polygon points="114,13 134,14 123,30" fill="#C78BFF" />
          <polygon points="160,15 180,15 170,31" fill="#5BE3F5" />
          <polygon points="208,15 228,15 218,31" fill="#FF4FA6" />
          <polygon points="256,14 276,13 266,29" fill="#FFD84D" />
          <polygon points="302,11 322,10 312,26" fill="#C78BFF" />
          <polygon points="348,8 368,6 358,22" fill="#5BE3F5" />
        </svg>

        <button
          type="button"
          onClick={() => onEnter(false)}
          className="absolute top-4 right-4 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#5A4A58] hover:text-[#D81E78] hover:bg-[#FFF0F7] transition-colors cursor-pointer"
        >
          Skip Intro &rarr;
        </button>

        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#D81E78] mb-3">
          20th November &middot; Turning 11 Birthday Party
        </p>

        <p className="font-editorial italic text-xl sm:text-2xl text-[#5A4A58] mb-1">
          A Magical 11th Birthday Party For
        </p>

        <h2 className="font-serif-display text-4xl sm:text-5xl font-bold text-[#2D242C] tracking-tight mb-2">
          Simran
        </h2>

        <p className="font-script text-3xl sm:text-4xl barbie-shimmer mb-5 inline-block">
          Our Sweetest Khushi &middot; Khushi Mama
        </p>

        <p className="text-sm sm:text-base text-[#5A4A58] max-w-md mx-auto leading-relaxed mb-7">
          Step inside your sparkling Barbie cake party with glowing candles, floating balloons, surprise scratch cards, family photos, and birthday wishes!
        </p>

        <button
          type="button"
          onClick={() => onEnter(true)}
          className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-full bg-gradient-to-r from-[#EC2C88] via-[#B45CF6] to-[#F5B82E] text-white font-semibold text-base shadow-lg hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          <span>Open 11th Birthday Party</span>
        </button>

        <p className="text-xs text-[#5A4A58] mt-4">
          Plays Simran’s Happy Birthday song &amp; opens the 3D princess cake stage
        </p>
      </div>
    </div>
  );
}
