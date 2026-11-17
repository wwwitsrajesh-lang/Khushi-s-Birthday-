import { createClient } from '@supabase/supabase-js';
import { BirthdayWish, MemoryItem } from '../types/birthday';

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://rsvznczapxhvioveqzuh.supabase.co';
const SUPABASE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_m_2xwoQoMGQod-D9CjRzbg_8TnXCabH';
const SUPABASE_BUCKET = import.meta.env.VITE_SUPABASE_STORAGE_BUCKET || 'birthday-media';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

let apiBackendAvailable: boolean | null = null;

export const STARTER_MEMORIES: MemoryItem[] = [
  {
    id: 'khushi-mem-video-1',
    kind: 'video',
    url: '/assets/aistudio/v_a804cbbb.mp4',
    caption:
      'Happy Birthday Simran! A special video tribute filled with smiles, karate spirit, and joyful childhood memories.',
    authorName: 'Family Tribute',
    relation: 'Birthday Video',
    createdAt: '2026-11-16T08:00:00.000Z',
    hearts: 36,
    isFeatured: true,
  },
  {
    id: 'khushi-mem-photo-1',
    kind: 'photo',
    url: '/assets/aistudio/b_f83e660f.png',
    caption:
      'Happy Birthday Khushi Mama — May all your dreams come true, stay happy always, you are so special!',
    authorName: 'With Love',
    relation: 'Birthday Card Collage',
    createdAt: '2026-11-16T07:45:00.000Z',
    hearts: 29,
    isFeatured: true,
  },
  {
    id: 'khushi-mem-photo-2',
    kind: 'photo',
    url: '/assets/aistudio/a_6114bfb6.png',
    caption:
      'Happy Birthday Khushi Mama — Celebrating together with roses, candlelight, and birthday cake.',
    authorName: 'Family Celebration',
    relation: 'Special Portrait',
    createdAt: '2026-11-16T07:30:00.000Z',
    hearts: 27,
    isFeatured: true,
  },
  {
    id: 'khushi-mem-photo-3',
    kind: 'photo',
    url: '/assets/aistudio/c_c4d675b7.png',
    caption:
      'From martial arts strength and creative projects to radiant smiles among the flowers.',
    authorName: 'Shining Moments',
    relation: 'Memory Collage',
    createdAt: '2026-11-16T07:15:00.000Z',
    hearts: 25,
    isFeatured: true,
  },
];

export const STARTER_WISHES: BirthdayWish[] = [
  {
    id: 'seed-wish-1',
    authorName: 'Masi & Family',
    relation: 'Your Loving Family',
    sticker: '🎂',
    message:
      'Happy Birthday, Simran! True to your name Khushi, you bring pure sunshine, warmth, and laughter into every room you enter. May your year ahead sparkle brighter than ever.',
    createdAt: '2026-11-16T08:15:00.000Z',
    hearts: 18,
    isPinned: true,
  },
  {
    id: 'seed-wish-2',
    authorName: 'Little Nephews & Nieces',
    relation: 'Your Biggest Fans',
    sticker: '🎈',
    message:
      'Happy Birthday Khushi Mama! Thank you for always making every weekend feel like a festival, telling the best stories, and sharing extra cake slices with us!',
    createdAt: '2026-11-16T07:45:00.000Z',
    hearts: 27,
  },
  {
    id: 'seed-wish-3',
    authorName: 'Dadi & Dada Ji',
    relation: 'Grandparents',
    sticker: '💐',
    message:
      'Endless blessings on 19th November, beta. May good health, wisdom, courage, and joyful milestones always walk beside you.',
    createdAt: '2026-11-16T07:10:00.000Z',
    hearts: 21,
  },
];

export function sortWishes(list: BirthdayWish[]): BirthdayWish[] {
  return [...list].sort((a, b) => {
    const aPinned = a.isPinned ? 1 : 0;
    const bPinned = b.isPinned ? 1 : 0;
    if (aPinned !== bPinned) return bPinned - aPinned;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

async function tryParseJson<T>(res: Response): Promise<T | null> {
  const ct = res.headers.get('content-type') || '';
  if (!ct.toLowerCase().includes('application/json')) {
    return null;
  }
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function loadMemories(): Promise<MemoryItem[]> {
  if (apiBackendAvailable !== false) {
    try {
      const res = await fetch('/api/memories');
      const data = await tryParseJson<{ memories?: MemoryItem[] }>(res);
      if (res.ok && data?.memories) {
        apiBackendAvailable = true;
        return data.memories;
      }
      apiBackendAvailable = false;
    } catch {
      apiBackendAvailable = false;
    }
  }

  try {
    const { data, error } = await supabase
      .from('memories')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) {
      if (data.length > 0) {
        return data.map((row) => ({
          id: row.id,
          kind: row.kind,
          url: row.url,
          caption: row.caption,
          authorName: row.author_name,
          relation: row.relation,
          createdAt: row.created_at,
          hearts: Number(row.hearts || 0),
          isFeatured: Boolean(row.is_featured),
        }));
      }
      await supabase.from('memories').upsert(
        STARTER_MEMORIES.map((m) => ({
          id: m.id,
          kind: m.kind,
          url: m.url,
          storage_path: null,
          caption: m.caption,
          author_name: m.authorName,
          relation: m.relation,
          created_at: m.createdAt,
          hearts: m.hearts,
          is_featured: Boolean(m.isFeatured),
        })),
        { onConflict: 'id', ignoreDuplicates: true }
      );
    }
  } catch {
    // Fall back cleanly
  }

  return STARTER_MEMORIES;
}

export async function loadWishes(): Promise<BirthdayWish[]> {
  if (apiBackendAvailable !== false) {
    try {
      const res = await fetch('/api/wishes');
      const data = await tryParseJson<{ wishes?: BirthdayWish[] }>(res);
      if (res.ok && data?.wishes) {
        apiBackendAvailable = true;
        return sortWishes(data.wishes);
      }
      apiBackendAvailable = false;
    } catch {
      apiBackendAvailable = false;
    }
  }

  try {
    const { data, error } = await supabase
      .from('wishes')
      .select('*')
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });
    if (!error && data) {
      if (data.length > 0) {
        return sortWishes(
          data.map((row) => ({
            id: row.id,
            authorName: row.author_name,
            relation: row.relation,
            sticker: row.sticker,
            message: row.message,
            createdAt: row.created_at,
            hearts: Number(row.hearts || 0),
            isPinned: Boolean(row.is_pinned),
          }))
        );
      }
      await supabase.from('wishes').upsert(
        STARTER_WISHES.map((w) => ({
          id: w.id,
          author_name: w.authorName,
          relation: w.relation,
          sticker: w.sticker,
          message: w.message,
          created_at: w.createdAt,
          hearts: w.hearts,
          is_pinned: Boolean(w.isPinned),
        })),
        { onConflict: 'id', ignoreDuplicates: true }
      );
    }
  } catch {
    // Fall back cleanly
  }

  return sortWishes(STARTER_WISHES);
}

export async function uploadMemoryItem(formData: FormData): Promise<MemoryItem> {
  if (apiBackendAvailable !== false) {
    try {
      const res = await fetch('/api/memories', {
        method: 'POST',
        body: formData,
      });
      const data = await tryParseJson<{ memory?: MemoryItem; error?: string }>(res);
      if (res.ok && data?.memory) {
        apiBackendAvailable = true;
        return data.memory;
      }
      if (data?.error) {
        throw new Error(data.error);
      }
      apiBackendAvailable = false;
    } catch (err) {
      if (err instanceof Error && !/json|fetch|network/i.test(err.message)) {
        throw err;
      }
      apiBackendAvailable = false;
    }
  }

  // Direct Supabase fallback (e.g., on static preview hosting)
  const file = formData.get('media');
  if (!(file instanceof File)) {
    throw new Error('Please select a photo or video file to upload.');
  }

  const ext = (file.name.split('.').pop() || 'bin').replace(/[^a-z0-9]/gi, '').toLowerCase() || 'bin';
  const storagePath = `uploads/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
  const { error: uploadErr } = await supabase.storage
    .from(SUPABASE_BUCKET)
    .upload(storagePath, file, { contentType: file.type || 'application/octet-stream' });

  if (uploadErr) {
    throw new Error('Could not upload photo or video right now.');
  }

  const publicUrl = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(storagePath).data.publicUrl;
  const kind: 'photo' | 'video' = file.type.startsWith('video/') ? 'video' : 'photo';
  const record: MemoryItem = {
    id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    kind,
    url: publicUrl,
    caption: String(formData.get('caption') || '').trim() || 'A permanent birthday memory for Simran (Khushi).',
    authorName: String(formData.get('authorName') || '').trim() || 'Family & Friends',
    relation: String(formData.get('relation') || '').trim() || 'Birthday Guest',
    createdAt: new Date().toISOString(),
    hearts: 1,
    isFeatured: false,
  };

  const { error: dbErr } = await supabase.from('memories').insert({
    id: record.id,
    kind: record.kind,
    url: record.url,
    storage_path: storagePath,
    caption: record.caption,
    author_name: record.authorName,
    relation: record.relation,
    created_at: record.createdAt,
    hearts: 1,
    is_featured: false,
  });

  if (dbErr) {
    throw new Error('Could not save photo or video metadata.');
  }
  return record;
}

export async function heartMemoryItem(id: string): Promise<MemoryItem | null> {
  if (apiBackendAvailable !== false) {
    try {
      const res = await fetch(`/api/memories/${encodeURIComponent(id)}/heart`, {
        method: 'POST',
      });
      const data = await tryParseJson<{ memory?: MemoryItem }>(res);
      if (res.ok && data?.memory) {
        apiBackendAvailable = true;
        return data.memory;
      }
      apiBackendAvailable = false;
    } catch {
      apiBackendAvailable = false;
    }
  }

  const { data: existing } = await supabase
    .from('memories')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (!existing) return null;

  const nextHearts = Number(existing.hearts || 0) + 1;
  const { data: updated } = await supabase
    .from('memories')
    .update({ hearts: nextHearts })
    .eq('id', id)
    .select()
    .single();
  if (!updated) return null;

  return {
    id: updated.id,
    kind: updated.kind,
    url: updated.url,
    caption: updated.caption,
    authorName: updated.author_name,
    relation: updated.relation,
    createdAt: updated.created_at,
    hearts: Number(updated.hearts || 0),
    isFeatured: Boolean(updated.is_featured),
  };
}

export async function postWishItem(payload: {
  authorName: string;
  relation: string;
  sticker: string;
  message: string;
}): Promise<BirthdayWish> {
  if (apiBackendAvailable !== false) {
    try {
      const res = await fetch('/api/wishes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await tryParseJson<{ wish?: BirthdayWish; error?: string }>(res);
      if (res.ok && data?.wish) {
        apiBackendAvailable = true;
        return data.wish;
      }
      if (data?.error) {
        throw new Error(data.error);
      }
      apiBackendAvailable = false;
    } catch (err) {
      if (err instanceof Error && !/json|fetch|network/i.test(err.message)) {
        throw err;
      }
      apiBackendAvailable = false;
    }
  }

  const wish: BirthdayWish = {
    id: `wish-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    authorName: payload.authorName,
    relation: payload.relation,
    sticker: payload.sticker,
    message: payload.message,
    createdAt: new Date().toISOString(),
    hearts: 1,
    isPinned: false,
  };

  const { error } = await supabase.from('wishes').insert({
    id: wish.id,
    author_name: wish.authorName,
    relation: wish.relation,
    sticker: wish.sticker,
    message: wish.message,
    created_at: wish.createdAt,
    hearts: 1,
    is_pinned: false,
  });

  if (error) {
    throw new Error('Could not post birthday message.');
  }
  return wish;
}

export async function heartWishItem(id: string): Promise<BirthdayWish | null> {
  if (apiBackendAvailable !== false) {
    try {
      const res = await fetch(`/api/wishes/${encodeURIComponent(id)}/heart`, {
        method: 'POST',
      });
      const data = await tryParseJson<{ wish?: BirthdayWish }>(res);
      if (res.ok && data?.wish) {
        apiBackendAvailable = true;
        return data.wish;
      }
      apiBackendAvailable = false;
    } catch {
      apiBackendAvailable = false;
    }
  }

  const { data: existing } = await supabase
    .from('wishes')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (!existing) return null;

  const nextHearts = Number(existing.hearts || 0) + 1;
  const { data: updated } = await supabase
    .from('wishes')
    .update({ hearts: nextHearts })
    .eq('id', id)
    .select()
    .single();
  if (!updated) return null;

  return {
    id: updated.id,
    authorName: updated.author_name,
    relation: updated.relation,
    sticker: updated.sticker,
    message: updated.message,
    createdAt: updated.created_at,
    hearts: Number(updated.hearts || 0),
    isPinned: Boolean(updated.is_pinned),
  };
}

export async function updateMemoryItem(id: string, formData: FormData): Promise<MemoryItem> {
  if (apiBackendAvailable !== false) {
    try {
      const res = await fetch(`/api/memories/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: formData,
      });
      const data = await tryParseJson<{ memory?: MemoryItem; error?: string }>(res);
      if (res.ok && data?.memory) {
        apiBackendAvailable = true;
        return data.memory;
      }
      if (data?.error) {
        throw new Error(data.error);
      }
      apiBackendAvailable = false;
    } catch (err) {
      if (err instanceof Error && !/json|fetch|network/i.test(err.message)) {
        throw err;
      }
      apiBackendAvailable = false;
    }
  }

  const authorName = String(formData.get('authorName') || '').trim() || 'Family & Friends';
  const relation = String(formData.get('relation') || '').trim() || 'Birthday Guest';
  const caption =
    String(formData.get('caption') || '').trim() ||
    'A permanent birthday memory for Simran (Khushi).';

  const patch: Record<string, unknown> = {
    author_name: authorName,
    relation,
    caption,
  };

  const file = formData.get('media');
  if (file instanceof File) {
    const ext =
      (file.name.split('.').pop() || 'bin').replace(/[^a-z0-9]/gi, '').toLowerCase() || 'bin';
    const storagePath = `uploads/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
    const { error: uploadErr } = await supabase.storage
      .from(SUPABASE_BUCKET)
      .upload(storagePath, file, { contentType: file.type || 'application/octet-stream' });

    if (uploadErr) {
      throw new Error('Could not upload replacement photo or video.');
    }

    patch.url = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(storagePath).data.publicUrl;
    patch.storage_path = storagePath;
    patch.kind = file.type.startsWith('video/') ? 'video' : 'photo';
  }

  const { data: updated, error } = await supabase
    .from('memories')
    .update(patch)
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error || !updated) {
    throw new Error('Could not update memory right now.');
  }

  return {
    id: updated.id,
    kind: updated.kind,
    url: updated.url,
    caption: updated.caption,
    authorName: updated.author_name,
    relation: updated.relation,
    createdAt: updated.created_at,
    hearts: Number(updated.hearts || 0),
    isFeatured: Boolean(updated.is_featured),
  };
}

export async function updateWishItem(
  id: string,
  payload: {
    authorName: string;
    relation: string;
    sticker: string;
    message: string;
  }
): Promise<BirthdayWish> {
  if (apiBackendAvailable !== false) {
    try {
      const res = await fetch(`/api/wishes/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await tryParseJson<{ wish?: BirthdayWish; error?: string }>(res);
      if (res.ok && data?.wish) {
        apiBackendAvailable = true;
        return data.wish;
      }
      if (data?.error) {
        throw new Error(data.error);
      }
      apiBackendAvailable = false;
    } catch (err) {
      if (err instanceof Error && !/json|fetch|network/i.test(err.message)) {
        throw err;
      }
      apiBackendAvailable = false;
    }
  }

  const { data: updated, error } = await supabase
    .from('wishes')
    .update({
      author_name: payload.authorName,
      relation: payload.relation,
      sticker: payload.sticker,
      message: payload.message,
    })
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error || !updated) {
    throw new Error('Could not update birthday message right now.');
  }

  return {
    id: updated.id,
    authorName: updated.author_name,
    relation: updated.relation,
    sticker: updated.sticker,
    message: updated.message,
    createdAt: updated.created_at,
    hearts: Number(updated.hearts || 0),
    isPinned: Boolean(updated.is_pinned),
  };
}
