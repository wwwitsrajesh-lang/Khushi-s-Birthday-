// Birthday Audio Engine: Plays the custom uploaded track (/assets/aistudio/Birthday_cedffa25.mp3)
// plus procedural Web Audio chimes for 3D candle & gift interactions.

const BIRTHDAY_TRACK_URL = '/assets/aistudio/Birthday_cedffa25.mp3';

class BirthdayAudioEngine {
  private audio: HTMLAudioElement | null = null;
  private ctx: AudioContext | null = null;
  private isPlaying = false;
  private pausedByVideo = false;
  private listeners = new Set<(playing: boolean) => void>();

  private ensureAudioElement(): HTMLAudioElement | null {
    if (typeof window === 'undefined') return null;
    if (!this.audio) {
      const el = new Audio(BIRTHDAY_TRACK_URL);
      el.loop = true;
      el.preload = 'auto';
      el.volume = 0.85;

      el.addEventListener('play', () => {
        this.isPlaying = true;
        this.notify();
      });
      el.addEventListener('pause', () => {
        this.isPlaying = false;
        this.notify();
      });
      el.addEventListener('ended', () => {
        this.isPlaying = false;
        this.notify();
      });

      this.audio = el;
    }
    return this.audio;
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  public subscribe(fn: (playing: boolean) => void): () => void {
    this.listeners.add(fn);
    fn(this.isPlaying);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private notify(): void {
    this.listeners.forEach((fn) => fn(this.isPlaying));
  }

  public getPlaying(): boolean {
    return this.isPlaying;
  }

  public startMelody(): void {
    const el = this.ensureAudioElement();
    if (!el) return;
    this.pausedByVideo = false;
    if (!el.paused) return;

    void el.play().catch((err) => {
      console.warn('Audio playback awaited user gesture:', err);
      this.isPlaying = false;
      this.notify();
    });
  }

  public stopMelody(): void {
    this.pausedByVideo = false;
    if (!this.audio) return;
    this.audio.pause();
    this.isPlaying = false;
    this.notify();
  }

  public toggleMelody(): void {
    const el = this.ensureAudioElement();
    if (!el) return;
    if (el.paused) {
      this.startMelody();
    } else {
      this.stopMelody();
    }
  }

  public pauseForVideo(): void {
    const el = this.audio;
    if (el && !el.paused) {
      this.pausedByVideo = true;
      el.pause();
      this.isPlaying = false;
      this.notify();
    }
  }

  public resumeAfterVideo(): void {
    if (!this.pausedByVideo) return;
    this.pausedByVideo = false;
    this.startMelody();
  }

  private playChimeNote(freq: number, duration: number, volume = 0.08): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0005, now + duration + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration + 0.28);
  }

  public playSparkleBurst(): void {
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    notes.forEach((freq, idx) => {
      window.setTimeout(() => {
        this.playChimeNote(freq, 0.3, 0.06);
      }, idx * 65);
    });
  }

  public playWishChime(): void {
    const notes = [587.33, 739.99, 880.0, 1174.66];
    notes.forEach((freq, idx) => {
      window.setTimeout(() => {
        this.playChimeNote(freq, 0.4, 0.07);
      }, idx * 85);
    });
  }
}

export const birthdayAudio = new BirthdayAudioEngine();
