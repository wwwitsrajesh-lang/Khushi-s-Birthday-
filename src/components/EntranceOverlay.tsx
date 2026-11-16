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
      aria-label="Birthday Surprise Entrance for Simran"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gradient-to-br from-[#FFF5F7] via-[#F7E7CE] to-[#E6E6FA]"
    >
      <div className="relative max-w-lg w-full rounded-3xl bg-[#FFFDF9]/95 border border-[#EEDCE2] p-8 sm:p-11 text-center shadow-2xl">
        {/* Festive Bunting Garland */}
        <svg viewBox="0 0 400 36" className="w-full h-7 mb-3 pointer-events-none" aria-hidden="true">
          <path d="M0 4 Q200 22 400 4" fill="none" stroke="#D4AF37" strokeWidth="1.5" />
          <polygon points="24,6 44,8 33,24" fill="#FFD1DC" />
          <polygon points="68,10 88,11 77,27" fill="#D4AF37" />
          <polygon points="114,13 134,14 123,30" fill="#E6E6FA" />
          <polygon points="160,15 180,15 170,31" fill="#E09F9D" />
          <polygon points="208,15 228,15 218,31" fill="#FFD1DC" />
          <polygon points="256,14 276,13 266,29" fill="#D4AF37" />
          <polygon points="302,11 322,10 312,26" fill="#E6E6FA" />
          <polygon points="348,8 368,6 358,22" fill="#E09F9D" />
        </svg>

        <button
          type="button"
          onClick={() => onEnter(false)}
          className="absolute top-4 right-4 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#5A4A58] hover:text-[#2D242C] hover:bg-[#F7ECF0] transition-colors cursor-pointer"
        >
          Skip Intro &rarr;
        </button>

        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C25975] mb-3">
          19th November Birthday Party
        </p>

        <p className="font-editorial italic text-xl sm:text-2xl text-[#5A4A58] mb-1">
          A Special Birthday Celebration For
        </p>

        <h2 className="font-serif-display text-4xl sm:text-5xl font-bold text-[#2D242C] tracking-tight mb-2">
          Simran
        </h2>

        <p className="font-script text-3xl sm:text-4xl gold-foil mb-5">
          Our Dearest Khushi &middot; Khushi Mama
        </p>

        <p className="text-sm sm:text-base text-[#5A4A58] max-w-md mx-auto leading-relaxed mb-7">
          Step into an interactive 3D birthday party with candles, balloons, permanent family photos &amp; videos, and heartfelt birthday wishes.
        </p>

        <button
          type="button"
          onClick={() => onEnter(true)}
          className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-full bg-gradient-to-r from-[#C25975] to-[#D4AF37] text-white font-semibold text-base shadow-lg hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          <span>Open Birthday Party</span>
        </button>

        <p className="text-xs text-[#5A4A58] mt-4">
          Plays Simran’s custom Happy Birthday song &amp; opens the 3D cake stage
        </p>
      </div>
    </div>
  );
}
