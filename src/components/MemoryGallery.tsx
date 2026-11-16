import { useState, useRef, useEffect, FormEvent } from 'react';
import {
  Camera,
  Film,
  Heart,
  Upload,
  X,
  ChevronLeft,
  ChevronRight,
  Play,
  SlidersHorizontal,
  CheckCircle2,
} from 'lucide-react';
import { MemoryItem, PhotoFilter } from '../types/birthday';
import { birthdayAudio } from '../utils/audio';

interface MemoryGalleryProps {
  memories: MemoryItem[];
  isLoading: boolean;
  onUploadMemory: (formData: FormData) => Promise<void>;
  onHeartMemory: (id: string) => Promise<void>;
  externalUploadTriggerRef?: React.MutableRefObject<(() => void) | null>;
}

type GalleryFilter = 'all' | 'photo' | 'video' | 'favorites';

const PHOTO_FILTERS: Array<{ id: PhotoFilter; label: string }> = [
  { id: 'original', label: 'Original' },
  { id: 'golden', label: 'Golden Hour' },
  { id: 'vintage', label: 'Vintage Film' },
  { id: 'dreamy', label: 'Dreamy Blush' },
];

function formatDateLabel(iso: string): string {
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

export function MemoryGallery({
  memories,
  isLoading,
  onUploadMemory,
  onHeartMemory,
  externalUploadTriggerRef,
}: MemoryGalleryProps) {
  const [filter, setFilter] = useState<GalleryFilter>('all');
  const [photoFilter, setPhotoFilter] = useState<PhotoFilter>('original');
  const [showUploadForm, setShowUploadForm] = useState(false);

  // Upload form state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewKind, setPreviewKind] = useState<'photo' | 'video'>('photo');
  const [authorName, setAuthorName] = useState('');
  const [relation, setRelation] = useState('');
  const [caption, setCaption] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Lightbox / Slideshow state
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [brokenIds, setBrokenIds] = useState<Record<string, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const uploadSectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (externalUploadTriggerRef) {
      externalUploadTriggerRef.current = () => {
        setShowUploadForm(true);
        uploadSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      };
    }
  }, [externalUploadTriggerRef]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const filteredMemories = memories.filter((item) => {
    if (filter === 'photo') return item.kind === 'photo';
    if (filter === 'video') return item.kind === 'video';
    if (filter === 'favorites') return item.hearts >= 15;
    return true;
  });

  // Keyboard navigation in lightbox
  useEffect(() => {
    if (lightboxIndex === null) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxIndex(null);
      if (e.key === 'ArrowRight') {
        setLightboxIndex((prev) =>
          prev === null ? null : (prev + 1) % filteredMemories.length
        );
      }
      if (e.key === 'ArrowLeft') {
        setLightboxIndex((prev) =>
          prev === null
            ? null
            : (prev - 1 + filteredMemories.length) % filteredMemories.length
        );
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [lightboxIndex, filteredMemories.length]);

  const handleFilePick = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      setUploadError('Please choose a photo (JPG, PNG, WEBP) or video (MP4, MOV, WEBM).');
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      setUploadError('File exceeds 100 MB limit. Please select a smaller clip or photo.');
      return;
    }
    setUploadError(null);
    setUploadSuccess(false);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(file);
    setPreviewKind(file.type.startsWith('video/') ? 'video' : 'photo');
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setUploadError('Please select a photo or video first.');
      return;
    }
    setIsUploading(true);
    setUploadError(null);

    try {
      const fd = new FormData();
      fd.append('media', selectedFile);
      fd.append('authorName', authorName.trim() || 'Family & Friends');
      fd.append('relation', relation.trim() || 'Birthday Guest');
      fd.append(
        'caption',
        caption.trim() || 'A permanent birthday memory for Simran (Khushi).'
      );
      await onUploadMemory(fd);

      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setSelectedFile(null);
      setPreviewUrl(null);
      setAuthorName('');
      setRelation('');
      setCaption('');
      setUploadSuccess(true);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : 'Unable to save memory right now.'
      );
    } finally {
      setIsUploading(false);
    }
  };

  const filterClass =
    photoFilter === 'golden'
      ? 'filter-golden'
      : photoFilter === 'vintage'
        ? 'filter-vintage'
        : photoFilter === 'dreamy'
          ? 'filter-dreamy'
          : 'filter-original';

  const activeLightboxItem =
    lightboxIndex !== null ? filteredMemories[lightboxIndex] : null;

  useEffect(() => {
    if (!activeLightboxItem || activeLightboxItem.kind !== 'video') {
      birthdayAudio.resumeAfterVideo();
    }
    return () => {
      if (activeLightboxItem?.kind === 'video') {
        birthdayAudio.resumeAfterVideo();
      }
    };
  }, [activeLightboxItem]);

  return (
    <section id="memories" className="py-16 sm:py-24 px-4 sm:px-8 max-w-6xl mx-auto">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C25975] mb-2">
            Permanent Celebration Vault
          </p>
          <h2 className="font-fancy text-3xl sm:text-4xl font-bold text-[#2D242C] text-balance">
            Photos &amp; Videos for Khushi
          </h2>
          <p className="text-sm sm:text-base text-[#5A4A58] mt-2 max-w-2xl">
            Every photo and video shared here is saved permanently on the site so Simran and the family can revisit every smile anytime.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {filteredMemories.length > 0 && (
            <button
              type="button"
              onClick={() => setLightboxIndex(0)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-[#E7D8DF] text-xs font-semibold text-[#2D242C] hover:bg-[#FFF5F7] transition-colors cursor-pointer whitespace-nowrap"
            >
              <Play className="w-3.5 h-3.5 text-[#C25975]" />
              <span>Start Slideshow</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowUploadForm((prev) => !prev)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#C25975] text-white text-xs font-semibold hover:bg-[#A9445F] transition-colors cursor-pointer shadow-sm whitespace-nowrap"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{showUploadForm ? 'Hide Upload Box' : 'Add Photo or Video'}</span>
          </button>
        </div>
      </div>

      {/* Permanent Photo & Video Upload Form */}
      <div ref={uploadSectionRef}>
        {showUploadForm && (
          <form
            onSubmit={handleSubmit}
            className="mb-12 rounded-3xl bg-white border border-[#EBD8DF] p-6 sm:p-8 shadow-sm"
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              {/* Dropzone / Media Picker */}
              <div className="lg:col-span-5 flex flex-col">
                <label
                  htmlFor="memory-file-input"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleFilePick(e.dataTransfer.files?.[0]);
                  }}
                  className="flex-1 min-h-[240px] rounded-2xl border-2 border-dashed border-[#DFB9C5] bg-[#FFF8FA] hover:bg-[#FFF2F6] transition-colors flex flex-col items-center justify-center p-5 text-center cursor-pointer overflow-hidden relative"
                >
                  {previewUrl ? (
                    previewKind === 'video' ? (
                      <video
                        src={previewUrl}
                        controls
                        onPlay={() => birthdayAudio.pauseForVideo()}
                        onEnded={() => birthdayAudio.resumeAfterVideo()}
                        className="w-full h-56 object-contain rounded-xl bg-black"
                      />
                    ) : (
                      <img
                        src={previewUrl}
                        alt="Selected birthday memory preview"
                        className="w-full h-56 object-cover rounded-xl"
                      />
                    )
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded-full bg-[#FFE6EE] text-[#C25975] flex items-center justify-center mb-3">
                        <Camera className="w-5 h-5" />
                      </div>
                      <p className="text-sm font-semibold text-[#2D242C]">
                        Drop a photo or video here, or click to browse
                      </p>
                      <p className="text-xs text-[#5A4A58] mt-1">
                        Supports JPG, PNG, WEBP, MP4, MOV, WEBM (up to 100 MB)
                      </p>
                    </>
                  )}
                  <input
                    ref={fileInputRef}
                    id="memory-file-input"
                    type="file"
                    accept="image/*,video/*"
                    onChange={(e) => handleFilePick(e.target.files?.[0])}
                    className="sr-only"
                  />
                </label>
                {selectedFile && (
                  <p className="text-xs text-[#5A4A58] mt-2 truncate">
                    Selected: <strong className="text-[#2D242C]">{selectedFile.name}</strong>
                  </p>
                )}
              </div>

              {/* Metadata Inputs */}
              <div className="lg:col-span-7 flex flex-col justify-between gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="memory-author"
                      className="block text-xs font-semibold text-[#2D242C] mb-1.5"
                    >
                      Your Name
                    </label>
                    <input
                      id="memory-author"
                      type="text"
                      value={authorName}
                      onChange={(e) => setAuthorName(e.target.value)}
                      placeholder="e.g., Riya Masi"
                      maxLength={80}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#FFFDF9] border border-[#E5D3DA] text-sm text-[#2D242C] focus:outline-none focus:border-[#C25975]"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="memory-relation"
                      className="block text-xs font-semibold text-[#2D242C] mb-1.5"
                    >
                      Relation to Simran (Optional)
                    </label>
                    <input
                      id="memory-relation"
                      type="text"
                      value={relation}
                      onChange={(e) => setRelation(e.target.value)}
                      placeholder="e.g., Cousin, Best Friend, Nephew"
                      maxLength={60}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#FFFDF9] border border-[#E5D3DA] text-sm text-[#2D242C] focus:outline-none focus:border-[#C25975]"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="memory-caption"
                    className="block text-xs font-semibold text-[#2D242C] mb-1.5"
                  >
                    Memory Story or Caption
                  </label>
                  <textarea
                    id="memory-caption"
                    rows={3}
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Share the story behind this photo or video for Khushi Mama..."
                    maxLength={320}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#FFFDF9] border border-[#E5D3DA] text-sm text-[#2D242C] focus:outline-none focus:border-[#C25975]"
                  />
                </div>

                {uploadError && (
                  <p className="text-xs font-medium text-[#B91C1C]" role="alert">
                    {uploadError}
                  </p>
                )}

                {uploadSuccess && (
                  <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#15803D]">
                    <CheckCircle2 className="w-4 h-4" />
                    Saved permanently to the birthday gallery!
                  </p>
                )}

                <div className="flex flex-wrap items-center justify-end gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowUploadForm(false)}
                    className="px-4 py-2.5 rounded-xl border border-[#E5D3DA] text-xs font-semibold text-[#5A4A58] hover:text-[#2D242C] cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={isUploading}
                    className="px-6 py-2.5 rounded-xl bg-[#2D242C] text-white text-xs font-semibold hover:bg-[#493B47] disabled:opacity-60 transition-colors cursor-pointer"
                  >
                    {isUploading ? 'Saving Permanently...' : 'Save Memory Permanently'}
                  </button>
                </div>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* Filter & Mood Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-8 border-b border-[#EFE1E6]">
        <div className="flex items-center gap-1 p-1 rounded-xl bg-[#F6ECEF] w-fit overflow-x-auto">
          {(
            [
              { id: 'all', label: `All (${memories.length})` },
              {
                id: 'photo',
                label: `Photos (${memories.filter((m) => m.kind === 'photo').length})`,
              },
              {
                id: 'video',
                label: `Videos (${memories.filter((m) => m.kind === 'video').length})`,
              },
              { id: 'favorites', label: 'Most Loved' },
            ] as Array<{ id: GalleryFilter; label: string }>
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                filter === tab.id
                  ? 'bg-white text-[#2D242C] shadow-xs'
                  : 'text-[#5A4A58] hover:text-[#2D242C]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">
          <SlidersHorizontal className="w-3.5 h-3.5 text-[#5A4A58] shrink-0" />
          <span className="text-xs font-medium text-[#5A4A58] shrink-0">Tone:</span>
          {PHOTO_FILTERS.map((pf) => (
            <button
              key={pf.id}
              type="button"
              onClick={() => setPhotoFilter(pf.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                photoFilter === pf.id
                  ? 'bg-[#2D242C] text-white'
                  : 'text-[#5A4A58] hover:bg-[#F6ECEF]'
              }`}
            >
              {pf.label}
            </button>
          ))}
        </div>
      </div>

      {/* Gallery Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="rounded-2xl bg-white border border-[#EFE1E6] p-4 h-80 flex flex-col justify-between"
            >
              <div className="w-full h-56 rounded-xl bg-[#F8EFF2]" />
              <div className="h-4 w-2/3 rounded bg-[#F8EFF2]" />
            </div>
          ))}
        </div>
      ) : filteredMemories.length === 0 ? (
        <div className="rounded-3xl bg-white border border-[#EFE1E6] p-12 text-center">
          <Film className="w-8 h-8 text-[#C25975] mx-auto mb-3" />
          <h3 className="font-serif-display text-xl font-bold text-[#2D242C] mb-1">
            No {filter === 'video' ? 'videos' : 'memories'} here yet
          </h3>
          <p className="text-sm text-[#5A4A58] mb-5">
            Be the first to add a permanent {filter === 'video' ? 'video greeting' : 'photo or video'} for Simran!
          </p>
          <button
            type="button"
            onClick={() => setShowUploadForm(true)}
            className="px-5 py-2.5 rounded-xl bg-[#C25975] text-white text-xs font-semibold hover:bg-[#A9445F] cursor-pointer"
          >
            Add Photo or Video
          </button>
        </div>
      ) : (
        <div className="columns-1 md:columns-2 gap-6 space-y-6">
          {filteredMemories.map((item, idx) => {
            const isBroken = brokenIds[item.id];
            return (
              <article
                key={item.id}
                className="break-inside-avoid group rounded-2xl bg-white border border-[#EFE1E6] p-3.5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <button
                    type="button"
                    onClick={() => setLightboxIndex(idx)}
                    className="relative block w-full rounded-xl overflow-hidden bg-[#F9F0F3] cursor-pointer text-left"
                  >
                    {item.kind === 'video' ? (
                      <div className="relative w-full bg-[#1F171E]">
                        <video
                          src={item.url}
                          muted
                          playsInline
                          preload="metadata"
                          className="w-full h-auto block"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent flex items-center justify-center">
                          <span className="w-14 h-14 rounded-full bg-white/95 text-[#C25975] flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                            <Play className="w-6 h-6 fill-current ml-0.5" />
                          </span>
                        </div>
                      </div>
                    ) : isBroken ? (
                      <div className="w-full aspect-[3/4] flex flex-col items-center justify-center p-4 bg-gradient-to-br from-[#FFE8EF] to-[#F7E7CE] text-center">
                        <Camera className="w-7 h-7 text-[#C25975] mb-2" />
                        <span className="text-xs font-medium text-[#2D242C]">
                          {item.caption}
                        </span>
                      </div>
                    ) : (
                      <img
                        src={item.url}
                        alt={item.caption}
                        referrerPolicy="no-referrer"
                        onError={() =>
                          setBrokenIds((prev) => ({ ...prev, [item.id]: true }))
                        }
                        className={`w-full h-auto block group-hover:scale-[1.02] transition-transform duration-300 ${filterClass}`}
                      />
                    )}
                  </button>

                  {/* Clean unboxed metadata row (zero-pill discipline) */}
                  <div className="flex items-center gap-2 text-xs text-[#5A4A58] mt-3 px-1">
                    <span className="font-semibold text-[#C25975]">
                      {item.kind === 'video' ? 'Video' : 'Photo'}
                    </span>
                    <span aria-hidden="true">&middot;</span>
                    <span className="truncate">{item.authorName}</span>
                    <span aria-hidden="true">&middot;</span>
                    <span className="shrink-0">{formatDateLabel(item.createdAt)}</span>
                  </div>

                  <p className="text-sm text-[#2D242C] leading-relaxed mt-1.5 px-1">
                    {item.caption}
                  </p>
                </div>

                <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#F4EAEF] px-1">
                  <span className="text-xs text-[#5A4A58] truncate">{item.relation}</span>
                  <button
                    type="button"
                    onClick={() => void onHeartMemory(item.id)}
                    aria-label={`Send heart to memory by ${item.authorName}`}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-[#FFF0F4] text-xs font-semibold text-[#C25975] transition-colors cursor-pointer tabular-nums"
                  >
                    <Heart className="w-3.5 h-3.5 fill-[#C25975]" />
                    <span>{item.hearts}</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Fullscreen Lightbox & Slideshow Modal */}
      {activeLightboxItem && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Birthday Memory Viewer"
          className="fixed inset-0 z-50 bg-[#1B141A]/94 flex items-center justify-center p-4 sm:p-8"
        >
          <button
            type="button"
            onClick={() => setLightboxIndex(null)}
            aria-label="Close viewer"
            className="absolute top-4 right-4 sm:top-6 sm:right-6 w-10 h-10 rounded-full bg-white/12 hover:bg-white/25 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {filteredMemories.length > 1 && (
            <>
              <button
                type="button"
                onClick={() =>
                  setLightboxIndex(
                    (lightboxIndex! - 1 + filteredMemories.length) %
                      filteredMemories.length
                  )
                }
                aria-label="Previous memory"
                className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/12 hover:bg-white/25 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() =>
                  setLightboxIndex((lightboxIndex! + 1) % filteredMemories.length)
                }
                aria-label="Next memory"
                className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/12 hover:bg-white/25 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}

          <div className="max-w-4xl w-full flex flex-col items-center">
            <div className="w-full max-h-[72vh] rounded-2xl overflow-hidden bg-black/50 flex items-center justify-center">
              {activeLightboxItem.kind === 'video' ? (
                <video
                  key={activeLightboxItem.id}
                  src={activeLightboxItem.url}
                  controls
                  autoPlay
                  playsInline
                  onPlay={() => birthdayAudio.pauseForVideo()}
                  onEnded={() => birthdayAudio.resumeAfterVideo()}
                  className="max-h-[72vh] w-full object-contain"
                />
              ) : (
                <img
                  src={activeLightboxItem.url}
                  alt={activeLightboxItem.caption}
                  referrerPolicy="no-referrer"
                  className={`max-h-[72vh] w-auto object-contain ${filterClass}`}
                />
              )}
            </div>

            <div className="w-full mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-white px-2">
              <div>
                <p className="text-xs text-white/70">
                  {activeLightboxItem.authorName} &middot; {activeLightboxItem.relation} &middot;{' '}
                  {formatDateLabel(activeLightboxItem.createdAt)}
                </p>
                <p className="text-base font-medium mt-1">{activeLightboxItem.caption}</p>
              </div>
              <button
                type="button"
                onClick={() => void onHeartMemory(activeLightboxItem.id)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-sm font-semibold text-white shrink-0 cursor-pointer tabular-nums"
              >
                <Heart className="w-4 h-4 fill-[#FF9EBC] text-[#FF9EBC]" />
                <span>{activeLightboxItem.hearts}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
