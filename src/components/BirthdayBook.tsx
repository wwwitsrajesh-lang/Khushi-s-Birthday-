import { FormEvent, useState } from 'react';
import { Heart, Send, CheckCircle2, Pin } from 'lucide-react';
import { BirthdayWish } from '../types/birthday';

interface BirthdayBookProps {
  wishes: BirthdayWish[];
  isLoading: boolean;
  onAddWish: (payload: {
    authorName: string;
    relation: string;
    sticker: string;
    message: string;
  }) => Promise<void>;
  onHeartWish: (id: string) => Promise<void>;
}

const STICKERS = ['🎂', '🎈', '💐', '✨', '🎁', '💖'];

function formatWishDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return 'Nov 2026';
  }
}

export function BirthdayBook({
  wishes,
  isLoading,
  onAddWish,
  onHeartWish,
}: BirthdayBookProps) {
  const [authorName, setAuthorName] = useState('');
  const [relation, setRelation] = useState('');
  const [sticker, setSticker] = useState('🎂');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [savedBanner, setSavedBanner] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!authorName.trim() || !message.trim()) {
      setErrorMsg('Please enter both your name and a birthday wish for Simran.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setSavedBanner(false);

    try {
      await onAddWish({
        authorName: authorName.trim(),
        relation: relation.trim() || 'Family & Friends',
        sticker,
        message: message.trim(),
      });
      setAuthorName('');
      setRelation('');
      setMessage('');
      setSavedBanner(true);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Unable to save wish right now.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="birthday-book" className="py-16 sm:py-24 px-4 sm:px-8 max-w-6xl mx-auto">
      {/* Heartfelt Letter + Guestbook Form Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch mb-14">
        {/* Left: Family Letter */}
        <article className="lg:col-span-5 rounded-3xl bg-gradient-to-br from-[#FFF6F8] to-[#F7E7CE]/75 border border-[#EEDCE2] p-8 sm:p-10 flex flex-col justify-between shadow-xs">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C25975] mb-3">
              A Note For 19th November
            </p>
            <h2 className="font-fancy text-2xl sm:text-3xl font-bold text-[#2D242C] mb-5 text-balance">
              Dearest Simran,
            </h2>
            <div className="space-y-4 font-editorial text-lg sm:text-xl text-[#3F333D] leading-relaxed">
              <p>
                True to your beloved nickname <strong className="font-semibold text-[#2D242C]">Khushi</strong>, you turn ordinary days into celebrations and fill every corner of our lives with warmth.
              </p>
              <p>
                From joyful family gatherings to the sweetest little moments with everyone who calls you <strong className="font-semibold text-[#2D242C]">Khushi Mama</strong>, we wish you endless health, courage, laughter, and magic this year.
              </p>
            </div>
          </div>

          <p className="font-script text-3xl text-[#C25975] mt-8">
            With endless love &mdash; Your Family
          </p>
        </article>

        {/* Right: Sign the Permanent Birthday Book */}
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-7 rounded-3xl bg-white border border-[#EEDCE2] p-7 sm:p-9 shadow-xs flex flex-col justify-between"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C25975] mb-1.5">
              Permanent Guestbook
            </p>
            <h3 className="font-fancy text-xl sm:text-2xl font-bold text-[#2D242C] mb-5">
              Leave a Birthday Message
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label
                  htmlFor="wish-name"
                  className="block text-xs font-semibold text-[#2D242C] mb-1.5"
                >
                  Your Name
                </label>
                <input
                  id="wish-name"
                  type="text"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="e.g., Ananya"
                  maxLength={80}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#FFFDF9] border border-[#E5D3DA] text-sm text-[#2D242C] focus:outline-none focus:border-[#C25975]"
                />
              </div>

              <div>
                <label
                  htmlFor="wish-relation"
                  className="block text-xs font-semibold text-[#2D242C] mb-1.5"
                >
                  Who Are You to Simran?
                </label>
                <input
                  id="wish-relation"
                  type="text"
                  value={relation}
                  onChange={(e) => setRelation(e.target.value)}
                  placeholder="e.g., Sister, Best Friend, Niece"
                  maxLength={60}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#FFFDF9] border border-[#E5D3DA] text-sm text-[#2D242C] focus:outline-none focus:border-[#C25975]"
                />
              </div>
            </div>

            <div className="mb-4">
              <span className="block text-xs font-semibold text-[#2D242C] mb-1.5">
                Pick a Celebration Stamp
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {STICKERS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSticker(s)}
                    aria-label={`Select stamp ${s}`}
                    className={`w-10 h-10 rounded-xl text-lg flex items-center justify-center border transition-colors cursor-pointer ${
                      sticker === s
                        ? 'bg-[#FFF0F4] border-[#C25975] shadow-xs'
                        : 'bg-[#FFFDF9] border-[#E5D3DA] hover:bg-[#FFF5F7]'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label
                htmlFor="wish-message"
                className="block text-xs font-semibold text-[#2D242C] mb-1.5"
              >
                Your Birthday Message
              </label>
              <textarea
                id="wish-message"
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write a heartfelt birthday blessing or funny memory for Simran (Khushi)..."
                maxLength={800}
                className="w-full px-4 py-3 rounded-xl bg-[#FFFDF9] border border-[#E5D3DA] text-sm text-[#2D242C] focus:outline-none focus:border-[#C25975]"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div>
              {errorMsg && (
                <p className="text-xs font-medium text-[#B91C1C]" role="alert">
                  {errorMsg}
                </p>
              )}
              {savedBanner && (
                <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#15803D]">
                  <CheckCircle2 className="w-4 h-4" />
                  Message pinned permanently in the Birthday Book!
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#C25975] text-white text-xs font-semibold hover:bg-[#A9445F] disabled:opacity-60 transition-colors cursor-pointer shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Posting Wish...' : 'Post your Wish'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Permanent Wishes Wall */}
      <div className="mb-6 flex items-baseline justify-between gap-4">
        <h3 className="font-fancy text-2xl sm:text-3xl font-bold text-[#2D242C]">
          Birthday Wishes Wall
        </h3>
        <span className="text-xs font-medium text-[#5A4A58] tabular-nums">
          {wishes.length} {wishes.length === 1 ? 'message' : 'messages'} saved permanently
        </span>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="rounded-2xl bg-white border border-[#EFE1E6] p-6 h-44"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...wishes]
            .sort((a, b) => {
              const ap = a.isPinned ? 1 : 0;
              const bp = b.isPinned ? 1 : 0;
              if (ap !== bp) return bp - ap;
              return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            })
            .map((wish) => (
            <article
              key={wish.id}
              className={`rounded-2xl p-6 shadow-xs flex flex-col justify-between border ${
                wish.isPinned
                  ? 'bg-gradient-to-br from-[#FFF9F2] via-[#FFFDF9] to-[#FFF2F6] border-[#E5C99B]'
                  : 'bg-white border-[#EFE1E6]'
              }`}
            >
              <div>
                {wish.isPinned && (
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#A67C2E] mb-2.5">
                    <Pin className="w-3 h-3 fill-[#D4AF37] text-[#A67C2E]" />
                    <span>Pinned Message</span>
                  </div>
                )}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h4 className="font-serif-display text-lg font-bold text-[#2D242C]">
                      {wish.authorName}
                    </h4>
                    <p className="text-xs text-[#5A4A58]">
                      {wish.relation} &middot; {formatWishDate(wish.createdAt)}
                    </p>
                  </div>
                  <span className="text-2xl leading-none" aria-hidden="true">
                    {wish.sticker}
                  </span>
                </div>

                <p className="font-editorial text-lg text-[#2D242C] leading-relaxed">
                  &ldquo;{wish.message}&rdquo;
                </p>
              </div>

              <div className="flex justify-end mt-5 pt-3 border-t border-[#F4EAEF]">
                <button
                  type="button"
                  onClick={() => void onHeartWish(wish.id)}
                  aria-label={`Celebrate wish from ${wish.authorName}`}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-[#FFF0F4] text-xs font-semibold text-[#C25975] transition-colors cursor-pointer tabular-nums"
                >
                  <Heart className="w-3.5 h-3.5 fill-[#C25975]" />
                  <span>{wish.hearts}</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
