import { useEffect, useRef, useState, useCallback } from 'react';
import { Disc3, Music, Pause, Play } from 'lucide-react';
import { BirthdayBook } from './components/BirthdayBook';
import { BirthdayStage3D } from './components/BirthdayStage3D';
import { BirthdaySurprises } from './components/BirthdaySurprises';
import { ConfettiCanvas, ConfettiHandle } from './components/ConfettiCanvas';
import { EntranceOverlay } from './components/EntranceOverlay';
import { FloatingPartyBackdrop } from './components/FloatingPartyBackdrop';
import { MemoryGallery } from './components/MemoryGallery';
import { BirthdayWish, MemoryItem } from './types/birthday';
import { birthdayAudio } from './utils/audio';
import {
  heartMemoryItem,
  heartWishItem,
  loadMemories,
  loadWishes,
  postWishItem,
  sortWishes,
  updateMemoryItem,
  updateWishItem,
  uploadMemoryItem,
} from './lib/keepsakeApi';

interface CountdownParts {
  days: string;
  hours: string;
  minutes: string;
  seconds: string;
  isToday: boolean;
  label: string;
}

function computeNov20Countdown(): CountdownParts {
  const now = new Date();
  const target = new Date(2026, 10, 20, 0, 0, 0); // 20-11-2026 00:00:00 local time
  const diff = target.getTime() - now.getTime();

  if (diff <= 0) {
    return {
      days: '00',
      hours: '00',
      minutes: '00',
      seconds: '00',
      isToday: true,
      label: '20-11-2026',
    };
  }

  const d = Math.floor(diff / (1000 * 60 * 60 * 24));
  const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const m = Math.floor((diff / (1000 * 60)) % 60);
  const s = Math.floor((diff / 1000) % 60);

  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    days: pad(d),
    hours: pad(h),
    minutes: pad(m),
    seconds: pad(s),
    isToday: false,
    label: `${d}d ${pad(h)}h ${pad(m)}m ${pad(s)}s`,
  };
}

function SparkleStar({
  className = 'w-5 h-5',
  color = '#F5B82E',
  delay = '0s',
}: {
  className?: string;
  color?: string;
  delay?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={color}
      className={`date-sparkle ${className}`}
      style={{ animationDelay: delay }}
      aria-hidden="true"
    >
      <path d="M12 1.5L14.4 9.6L22.5 12L14.4 14.4L12 22.5L9.6 14.4L1.5 12L9.6 9.6L12 1.5Z" />
    </svg>
  );
}

export default function App() {
  const [showEntrance, setShowEntrance] = useState(true);
  const [candlesLit, setCandlesLit] = useState(true);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [countdown, setCountdown] = useState<CountdownParts>(() =>
    computeNov20Countdown()
  );

  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [memoriesLoading, setMemoriesLoading] = useState(true);
  const [wishes, setWishes] = useState<BirthdayWish[]>([]);
  const [wishesLoading, setWishesLoading] = useState(true);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const confettiRef = useRef<ConfettiHandle | null>(null);
  const uploadTriggerRef = useRef<(() => void) | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  }, []);

  // Subscribe to procedural Happy Birthday audio engine
  useEffect(() => {
    return birthdayAudio.subscribe(setIsMusicPlaying);
  }, []);

  // Live 20th November countdown (switches to sparkling 20-11-2026 when over)
  useEffect(() => {
    const id = window.setInterval(() => {
      setCountdown(computeNov20Countdown());
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  // Load permanent memories and wishes (API -> Supabase -> bundled fallback)
  useEffect(() => {
    let active = true;

    const loadData = async () => {
      try {
        const [loadedMemories, loadedWishes] = await Promise.all([
          loadMemories(),
          loadWishes(),
        ]);
        if (active) {
          setMemories(loadedMemories);
          setWishes(loadedWishes);
        }
      } catch (err) {
        console.error('Failed to load birthday keepsakes:', err);
      } finally {
        if (active) {
          setMemoriesLoading(false);
          setWishesLoading(false);
        }
      }
    };

    void loadData();
    return () => {
      active = false;
    };
  }, []);

  const handleEnterParty = (withMusic: boolean) => {
    setShowEntrance(false);
    confettiRef.current?.burst(110, 0.42);
    if (withMusic) {
      birthdayAudio.startMelody();
    }
  };

  const handleToggleCandles = useCallback(
    (nextLit: boolean) => {
      setCandlesLit(nextLit);
      if (!nextLit) {
        birthdayAudio.playWishChime();
        confettiRef.current?.fireworks();
        showToast('Make an 11th birthday wish, Simran! Happy Birthday Khushi Mama!');
      } else {
        showToast('Candles relit and glowing with warm golden flames!');
      }
    },
    [showToast]
  );

  const handleCelebrate = useCallback(() => {
    birthdayAudio.playSparkleBurst();
    confettiRef.current?.fireworks();
  }, []);

  const handleUploadMemory = async (formData: FormData) => {
    const savedMemory = await uploadMemoryItem(formData);
    setMemories((prev) => [savedMemory, ...prev]);
    confettiRef.current?.burst(70, 0.5);
    birthdayAudio.playSparkleBurst();
    showToast('Memory saved permanently to the celebration vault!');
  };

  const handleHeartMemory = async (id: string) => {
    const updated = await heartMemoryItem(id);
    if (!updated) return;
    setMemories((prev) =>
      prev.map((item) => (item.id === id ? updated : item))
    );
  };

  const handleAddWish = async (payload: {
    authorName: string;
    relation: string;
    sticker: string;
    message: string;
  }) => {
    const savedWish = await postWishItem(payload);
    setWishes((prev) => sortWishes([savedWish, ...prev]));
    confettiRef.current?.burst(65, 0.55);
    birthdayAudio.playWishChime();
    showToast('Your birthday wish is posted below the pinned note!');
  };

  const handleHeartWish = async (id: string) => {
    const updated = await heartWishItem(id);
    if (!updated) return;
    setWishes((prev) =>
      prev.map((item) => (item.id === id ? updated : item))
    );
  };

  const handleUpdateMemory = async (id: string, formData: FormData) => {
    const updated = await updateMemoryItem(id, formData);
    setMemories((prev) => prev.map((item) => (item.id === id ? updated : item)));
    showToast('Memory updated permanently!');
  };

  const handleUpdateWish = async (
    id: string,
    payload: {
      authorName: string;
      relation: string;
      sticker: string;
      message: string;
    }
  ) => {
    const updated = await updateWishItem(id, payload);
    setWishes((prev) =>
      sortWishes(prev.map((item) => (item.id === id ? updated : item)))
    );
    showToast('Birthday wish updated!');
  };

  return (
    <div className="min-h-screen flex flex-col relative">
      <FloatingPartyBackdrop />
      <ConfettiCanvas ref={confettiRef} />
      <EntranceOverlay visible={showEntrance} onEnter={handleEnterParty} />

      {/* Festive Top Rainbow Bunting Garland & Twinkling Fairy Lights */}
      <div className="w-full overflow-hidden pointer-events-none select-none bg-gradient-to-r from-[#FFF0F8] via-[#F9F2FF] to-[#EEFBFD]">
        <svg viewBox="0 0 1200 46" className="w-full h-9 sm:h-11" aria-hidden="true">
          <path d="M0 5 Q300 28 600 9 T1200 9" fill="none" stroke="#F5B82E" strokeWidth="1.8" />
          <polygon points="35,8 75,12 52,34" fill="#FF4FA6" stroke="#fff" strokeWidth="1.2" />
          <polygon points="105,13 145,16 122,38" fill="#FFD84D" stroke="#fff" strokeWidth="1.2" />
          <polygon points="175,17 215,19 193,41" fill="#C78BFF" stroke="#fff" strokeWidth="1.2" />
          <polygon points="245,19 285,19 265,42" fill="#5BE3F5" stroke="#fff" strokeWidth="1.2" />
          <polygon points="315,19 355,17 336,40" fill="#FF85C2" stroke="#fff" strokeWidth="1.2" />
          <polygon points="385,16 425,13 407,36" fill="#FFD84D" stroke="#fff" strokeWidth="1.2" />
          <polygon points="455,12 495,10 476,32" fill="#FF4FA6" stroke="#fff" strokeWidth="1.2" />
          <polygon points="525,9 565,8 545,31" fill="#C78BFF" stroke="#fff" strokeWidth="1.2" />
          <polygon points="625,8 665,10 644,32" fill="#5BE3F5" stroke="#fff" strokeWidth="1.2" />
          <polygon points="695,11 735,14 713,36" fill="#FF4FA6" stroke="#fff" strokeWidth="1.2" />
          <polygon points="765,15 805,17 784,40" fill="#FFD84D" stroke="#fff" strokeWidth="1.2" />
          <polygon points="835,18 875,19 855,42" fill="#C78BFF" stroke="#fff" strokeWidth="1.2" />
          <polygon points="905,19 945,18 926,41" fill="#5BE3F5" stroke="#fff" strokeWidth="1.2" />
          <polygon points="975,17 1015,15 996,38" fill="#FF85C2" stroke="#fff" strokeWidth="1.2" />
          <polygon points="1045,13 1085,11 1066,34" fill="#FFD84D" stroke="#fff" strokeWidth="1.2" />
          <polygon points="1115,10 1155,8 1136,31" fill="#FF4FA6" stroke="#fff" strokeWidth="1.2" />
          <circle className="fairy-bulb" cx="90" cy="12" r="3.8" fill="#FFD84D" />
          <circle className="fairy-bulb" cx="230" cy="19" r="3.8" fill="#FF4FA6" style={{ animationDelay: '0.35s' }} />
          <circle className="fairy-bulb" cx="370" cy="16" r="3.8" fill="#5BE3F5" style={{ animationDelay: '0.7s' }} />
          <circle className="fairy-bulb" cx="510" cy="10" r="3.8" fill="#C78BFF" style={{ animationDelay: '1.0s' }} />
          <circle className="fairy-bulb" cx="680" cy="10" r="3.8" fill="#FFD84D" style={{ animationDelay: '0.25s' }} />
          <circle className="fairy-bulb" cx="820" cy="17" r="3.8" fill="#FF4FA6" style={{ animationDelay: '0.6s' }} />
          <circle className="fairy-bulb" cx="960" cy="17" r="3.8" fill="#5BE3F5" style={{ animationDelay: '0.9s' }} />
          <circle className="fairy-bulb" cx="1100" cy="11" r="3.8" fill="#C78BFF" style={{ animationDelay: '1.2s' }} />
        </svg>
      </div>

      {/* 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-40 bg-[#FFF9FD]/95 border-b border-[#F5CBE0]">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single-line Brand Wordmark */}
          <a
            href="#party-stage"
            className="font-fancy text-base sm:text-lg font-bold tracking-wide text-[#2D242C] whitespace-nowrap shrink-0"
          >
            Simran <span className="text-[#D81E78]">&middot; Turning 11</span>
          </a>

          {/* Zone 2: Concise single-line nav links */}
          <nav
            aria-label="Birthday sections"
            className="hidden md:flex items-center gap-7 text-sm font-medium text-[#5A4A58]"
          >
            <a
              href="#party-stage"
              className="hover:text-[#D81E78] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              3D Cake
            </a>
            <a
              href="#memories"
              className="hover:text-[#D81E78] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Memories
            </a>
            <a
              href="#surprises"
              className="hover:text-[#D81E78] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Surprises
            </a>
            <a
              href="#birthday-book"
              className="hover:text-[#D81E78] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Birthday Book
            </a>
          </nav>

          {/* Zone 3: 1 Primary Action */}
          <div className="shrink-0">
            <button
              type="button"
              onClick={() => uploadTriggerRef.current?.()}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#EC2C88] to-[#A86DF5] text-white text-xs font-semibold hover:brightness-105 transition-all cursor-pointer whitespace-nowrap shrink-0 shadow-xs"
            >
              Add Memory
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {/* 1. Interactive 3D Three.js Birthday Celebration Stage */}
        <BirthdayStage3D
          candlesLit={candlesLit}
          onToggleCandles={handleToggleCandles}
          onCelebrate={handleCelebrate}
          onGiftInspect={(msg) => showToast(msg)}
          countdownLabel={countdown.label}
          isBirthdayToday={countdown.isToday}
          isMusicPlaying={isMusicPlaying}
          onToggleMusic={() => birthdayAudio.toggleMelody()}
          onScrollToMemories={() => {
            document.getElementById('memories')?.scrollIntoView({ behavior: 'smooth' });
          }}
        />

        {/* 2. Live 20th November Countdown / Sparkling 20-11-2026 Banner & Birthday Vinyl Player */}
        <section className="py-14 px-4 sm:px-8 max-w-6xl mx-auto">
          <div className="rounded-3xl bg-white/95 border border-[#F3CEE0] p-6 sm:p-10 shadow-sm grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#D81E78] mb-2">
                {countdown.isToday
                  ? 'It’s Party Time · 11th Birthday Celebration!'
                  : '20th November · Turning 11 Countdown'}
              </p>
              <h2 className="font-fancy text-xl sm:text-2xl font-bold text-[#2D242C] mb-5 leading-snug">
                {countdown.isToday
                  ? 'Happy 11th Birthday, Simran (Khushi Mama)!'
                  : 'Counting Down to Simran’s 11th Birthday'}
              </h2>

              {countdown.isToday ? (
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#FFF0F8] via-[#FFF9E6] to-[#F4ECFF] border-2 border-[#F5B82E]/70 px-5 py-6 sm:px-8 sm:py-7 text-center shadow-xs">
                  {/* Animated Twinkling Corner & Floating Sparkles */}
                  <SparkleStar
                    className="w-6 h-6 absolute top-3 left-4"
                    color="#F5B82E"
                    delay="0s"
                  />
                  <SparkleStar
                    className="w-4 h-4 absolute top-5 left-14"
                    color="#FF3B9A"
                    delay="0.45s"
                  />
                  <SparkleStar
                    className="w-5 h-5 absolute bottom-3 left-7"
                    color="#22B8CF"
                    delay="0.9s"
                  />
                  <SparkleStar
                    className="w-6 h-6 absolute top-3 right-5"
                    color="#A86DF5"
                    delay="0.25s"
                  />
                  <SparkleStar
                    className="w-4 h-4 absolute bottom-4 right-14"
                    color="#F5B82E"
                    delay="0.7s"
                  />
                  <SparkleStar
                    className="w-5 h-5 absolute bottom-3 right-5"
                    color="#FF3B9A"
                    delay="1.15s"
                  />

                  <div className="relative z-10 flex items-center justify-center gap-3 sm:gap-4">
                    <SparkleStar className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" color="#FF3B9A" delay="0.15s" />
                    <span className="font-serif-display text-3xl sm:text-5xl font-bold tracking-wider barbie-shimmer tabular-nums">
                      20-11-2026
                    </span>
                    <SparkleStar className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" color="#F5B82E" delay="0.6s" />
                  </div>
                  <p className="relative z-10 font-editorial italic text-base sm:text-lg text-[#4A3B48] mt-2">
                    Shine bright on your magical 11th birthday, Khushi!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-3 sm:gap-4">
                  {[
                    {
                      label: 'Days',
                      value: countdown.days,
                      tileClass: 'bg-[#FFF0F7] border-[#F8C2DE]',
                      labelClass: 'text-[#C2186A]',
                    },
                    {
                      label: 'Hours',
                      value: countdown.hours,
                      tileClass: 'bg-[#F6EEFF] border-[#DFC6FF]',
                      labelClass: 'text-[#733CC9]',
                    },
                    {
                      label: 'Minutes',
                      value: countdown.minutes,
                      tileClass: 'bg-[#EDFBFE] border-[#B6EDF8]',
                      labelClass: 'text-[#0E7C90]',
                    },
                    {
                      label: 'Seconds',
                      value: countdown.seconds,
                      tileClass: 'bg-[#FFFBE8] border-[#F7DE8B]',
                      labelClass: 'text-[#9A6700]',
                    },
                  ].map((unit) => (
                    <div
                      key={unit.label}
                      className={`rounded-2xl border p-3 sm:p-4 text-center ${unit.tileClass}`}
                    >
                      <div className="font-serif-display text-2xl sm:text-4xl font-bold text-[#2D242C] tabular-nums">
                        {unit.value}
                      </div>
                      <div className={`text-[11px] sm:text-xs font-semibold mt-1 ${unit.labelClass}`}>
                        {unit.label}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="lg:col-span-5 rounded-2xl bg-gradient-to-br from-[#FFF0F8] via-[#F7EEFF] to-[#FFF8E1] border border-[#F3CEE0] p-6 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <div
                  className={`w-14 h-14 rounded-full bg-gradient-to-br from-[#EC2C88] to-[#8C4AE8] text-[#FFE875] flex items-center justify-center shrink-0 shadow-sm ${
                    isMusicPlaying ? 'animate-spin' : ''
                  }`}
                  style={{ animationDuration: '6s' }}
                >
                  <Disc3 className="w-7 h-7" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[#D81E78] flex items-center gap-1.5">
                    <Music className="w-3.5 h-3.5" />
                    <span>Simran’s 11th Birthday Song</span>
                  </p>
                  <p className="font-serif-display text-lg font-bold text-[#2D242C] truncate">
                    Janamdin Mubarak Khushi
                  </p>
                  <p className="text-xs text-[#5A4A58]">
                    {isMusicPlaying ? 'Playing party music' : 'Tap play to dance along'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => birthdayAudio.toggleMelody()}
                aria-label={isMusicPlaying ? 'Pause birthday melody' : 'Play birthday melody'}
                className="w-11 h-11 rounded-full bg-[#EC2C88] text-white flex items-center justify-center hover:bg-[#D01E74] transition-colors cursor-pointer shrink-0 shadow-sm"
              >
                {isMusicPlaying ? (
                  <Pause className="w-4 h-4 fill-current" />
                ) : (
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                )}
              </button>
            </div>
          </div>
        </section>

        {/* 3. Permanent Family Photo & Video Vault */}
        <MemoryGallery
          memories={memories}
          isLoading={memoriesLoading}
          onUploadMemory={handleUploadMemory}
          onUpdateMemory={handleUpdateMemory}
          onHeartMemory={handleHeartMemory}
          externalUploadTriggerRef={uploadTriggerRef}
        />

        {/* 4. Scratch-Off Blessings & 3D Flip-Cards */}
        <BirthdaySurprises onCelebrate={handleCelebrate} />

        {/* 5. Permanent Birthday Book & Heartfelt Family Letter */}
        <BirthdayBook
          wishes={wishes}
          isLoading={wishesLoading}
          onAddWish={handleAddWish}
          onUpdateWish={handleUpdateWish}
          onHeartWish={handleHeartWish}
        />
      </main>

      {/* Celebratory Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          className="fixed top-20 right-4 sm:right-8 z-40 max-w-sm rounded-2xl bg-[#2D242C] text-[#FFFDF9] px-5 py-3.5 shadow-xl border border-[#EC2C88]/60 text-sm font-medium"
        >
          {toastMessage}
        </div>
      )}

      {/* Clean Celebratory Footer */}
      <footer className="border-t border-[#F5CBE0] bg-gradient-to-r from-[#FFF0F8] via-[#FAF2FF] to-[#FFF9EA] py-10 px-4 text-center">
        <p className="font-script text-3xl sm:text-4xl barbie-shimmer mb-1 inline-block">
          Happy 11th Birthday, Simran (Khushi Mama)
        </p>
        <p className="text-xs text-[#5A4A58]">
          20th November Celebration (20-11-2026) &middot; All uploaded photos, videos, and messages are saved permanently.
        </p>
      </footer>
    </div>
  );
}
