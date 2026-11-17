import { createClient, SupabaseClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

export interface MemoryRecord {
  id: string;
  kind: 'photo' | 'video';
  url: string;
  caption: string;
  authorName: string;
  relation: string;
  createdAt: string;
  hearts: number;
  isFeatured?: boolean;
}

export interface WishRecord {
  id: string;
  authorName: string;
  relation: string;
  sticker: string;
  message: string;
  createdAt: string;
  hearts: number;
  isPinned?: boolean;
}

interface SupabaseMemoryRow {
  id: string;
  kind: 'photo' | 'video';
  url: string;
  storage_path?: string | null;
  caption: string;
  author_name: string;
  relation: string;
  created_at: string;
  hearts: number;
  is_featured?: boolean | null;
}

interface SupabaseWishRow {
  id: string;
  author_name: string;
  relation: string;
  sticker: string;
  message: string;
  created_at: string;
  hearts: number;
  is_pinned?: boolean | null;
}

const SUPABASE_URL =
  process.env.SUPABASE_URL?.trim() || 'https://rsvznczapxhvioveqzuh.supabase.co';
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
  process.env.SUPABASE_PUBLISHABLE_KEY?.trim() ||
  'sb_publishable_m_2xwoQoMGQod-D9CjRzbg_8TnXCabH';
const SUPABASE_BUCKET =
  process.env.SUPABASE_STORAGE_BUCKET?.trim() || 'birthday-media';

let client: SupabaseClient | null = null;
let seedAttempted = false;

export function getSupabaseClient(): SupabaseClient {
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return client;
}

function mapMemoryRow(row: SupabaseMemoryRow): MemoryRecord {
  return {
    id: row.id,
    kind: row.kind,
    url: row.url,
    caption: row.caption,
    authorName: row.author_name,
    relation: row.relation,
    createdAt: row.created_at,
    hearts: Number(row.hearts || 0),
    isFeatured: Boolean(row.is_featured),
  };
}

function mapWishRow(row: SupabaseWishRow): WishRecord {
  return {
    id: row.id,
    authorName: row.author_name,
    relation: row.relation,
    sticker: row.sticker,
    message: row.message,
    createdAt: row.created_at,
    hearts: Number(row.hearts || 0),
    isPinned: Boolean(row.is_pinned),
  };
}

export function sortWishes(wishes: WishRecord[]): WishRecord[] {
  return [...wishes].sort((a, b) => {
    const aPinned = a.isPinned ? 1 : 0;
    const bPinned = b.isPinned ? 1 : 0;
    if (aPinned !== bPinned) return bPinned - aPinned;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

function guessContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.mp4') return 'video/mp4';
  if (ext === '.mov') return 'video/quicktime';
  if (ext === '.webm') return 'video/webm';
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.gif') return 'image/gif';
  return 'image/jpeg';
}

function isMissingTableError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return (
    error.code === 'PGRST205' ||
    error.code === '42P01' ||
    /could not find the table/i.test(error.message || '')
  );
}

export async function syncLocalSeedToSupabase(
  rootDir: string,
  localMemories: MemoryRecord[],
  localWishes: WishRecord[]
): Promise<boolean> {
  const sb = getSupabaseClient();

  const [memHead, wishHead] = await Promise.all([
    sb.from('memories').select('id', { count: 'exact', head: true }),
    sb.from('wishes').select('id', { count: 'exact', head: true }),
  ]);

  if (memHead.error || wishHead.error) {
    if (isMissingTableError(memHead.error) || isMissingTableError(wishHead.error)) {
      return false;
    }
    return false;
  }

  if (!seedAttempted) {
    seedAttempted = true;

    if ((memHead.count ?? 0) === 0 && localMemories.length > 0) {
      const initialRows: SupabaseMemoryRow[] = localMemories.map((mem) => ({
        id: mem.id,
        kind: mem.kind,
        url: mem.url,
        storage_path: null,
        caption: mem.caption,
        author_name: mem.authorName,
        relation: mem.relation,
        created_at: mem.createdAt,
        hearts: mem.hearts,
        is_featured: Boolean(mem.isFeatured),
      }));

      const { error: insertMemErr } = await sb
        .from('memories')
        .upsert(initialRows, { onConflict: 'id', ignoreDuplicates: true });
      if (insertMemErr) {
        console.warn('Supabase initial memories seed warning:', insertMemErr.message);
      } else {
        // Upload starter photos/videos to Supabase Storage in the background
        void (async () => {
          for (const mem of localMemories) {
            let diskPath: string | null = null;
            if (mem.url.startsWith('/assets/aistudio/')) {
              diskPath = path.join(rootDir, 'public', mem.url.replace(/^\//, ''));
            } else if (mem.url.startsWith('/uploads/')) {
              diskPath = path.join(rootDir, 'data', mem.url.replace(/^\//, ''));
            }
            if (!diskPath || !fs.existsSync(diskPath)) continue;

            const filename = path.basename(diskPath);
            const candidatePath = `seed/${filename}`;
            const fileBuffer = fs.readFileSync(diskPath);
            const uploadRes = await sb.storage
              .from(SUPABASE_BUCKET)
              .upload(candidatePath, fileBuffer, {
                contentType: guessContentType(diskPath),
                upsert: true,
              });
            if (!uploadRes.error) {
              const publicUrl = sb.storage.from(SUPABASE_BUCKET).getPublicUrl(candidatePath).data.publicUrl;
              await sb
                .from('memories')
                .update({ url: publicUrl, storage_path: candidatePath })
                .eq('id', mem.id);
            }
          }
        })();
      }
    }

    if ((wishHead.count ?? 0) === 0 && localWishes.length > 0) {
      const wishRows: SupabaseWishRow[] = localWishes.map((w) => ({
        id: w.id,
        author_name: w.authorName,
        relation: w.relation,
        sticker: w.sticker,
        message: w.message,
        created_at: w.createdAt,
        hearts: w.hearts,
        is_pinned: Boolean(w.isPinned),
      }));

      const { error: insertWishErr } = await sb
        .from('wishes')
        .upsert(wishRows, { onConflict: 'id', ignoreDuplicates: true });
      if (insertWishErr) {
        console.warn('Supabase initial wishes seed warning:', insertWishErr.message);
      }
    }
  }

  return true;
}

export async function fetchMemoriesFromSupabase(): Promise<MemoryRecord[] | null> {
  const sb = getSupabaseClient();
  const { data, error } = await sb
    .from('memories')
    .select('*')
    .order('created_at', { ascending: false });

  if (error || !data) {
    if (!isMissingTableError(error) && error) {
      console.warn('Supabase fetch memories error:', error.message);
    }
    return null;
  }

  return (data as SupabaseMemoryRow[]).map(mapMemoryRow);
}

export async function saveMemoryToSupabase(params: {
  id: string;
  kind: 'photo' | 'video';
  filePath: string;
  filename: string;
  mimeType: string;
  caption: string;
  authorName: string;
  relation: string;
  createdAt: string;
}): Promise<MemoryRecord | null> {
  const sb = getSupabaseClient();
  const storagePath = `uploads/${params.filename}`;
  const fileBuffer = fs.readFileSync(params.filePath);

  const { error: storageErr } = await sb.storage
    .from(SUPABASE_BUCKET)
    .upload(storagePath, fileBuffer, {
      contentType: params.mimeType,
      upsert: false,
    });

  if (storageErr) {
    console.warn('Supabase storage upload fallback to local disk:', storageErr.message);
    return null;
  }

  const publicUrl = sb.storage.from(SUPABASE_BUCKET).getPublicUrl(storagePath).data.publicUrl;

  const row: SupabaseMemoryRow = {
    id: params.id,
    kind: params.kind,
    url: publicUrl,
    storage_path: storagePath,
    caption: params.caption,
    author_name: params.authorName,
    relation: params.relation,
    created_at: params.createdAt,
    hearts: 1,
    is_featured: false,
  };

  const { data, error: dbErr } = await sb
    .from('memories')
    .insert(row)
    .select()
    .single();

  if (dbErr || !data) {
    console.warn('Supabase memories insert fallback to local db:', dbErr?.message);
    return null;
  }

  return mapMemoryRow(data as SupabaseMemoryRow);
}

export async function incrementMemoryHeartInSupabase(id: string): Promise<MemoryRecord | null> {
  const sb = getSupabaseClient();
  const { data: existing, error: fetchErr } = await sb
    .from('memories')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (fetchErr || !existing) return null;

  const nextHearts = Number((existing as SupabaseMemoryRow).hearts || 0) + 1;
  const { data: updated, error: updateErr } = await sb
    .from('memories')
    .update({ hearts: nextHearts })
    .eq('id', id)
    .select()
    .single();

  if (updateErr || !updated) return null;
  return mapMemoryRow(updated as SupabaseMemoryRow);
}

export async function fetchWishesFromSupabase(): Promise<WishRecord[] | null> {
  const sb = getSupabaseClient();
  const { data, error } = await sb
    .from('wishes')
    .select('*')
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false });

  if (error || !data) {
    if (!isMissingTableError(error) && error) {
      console.warn('Supabase fetch wishes error:', error.message);
    }
    return null;
  }

  return sortWishes((data as SupabaseWishRow[]).map(mapWishRow));
}

export async function saveWishToSupabase(wish: WishRecord): Promise<WishRecord | null> {
  const sb = getSupabaseClient();
  const row: SupabaseWishRow = {
    id: wish.id,
    author_name: wish.authorName,
    relation: wish.relation,
    sticker: wish.sticker,
    message: wish.message,
    created_at: wish.createdAt,
    hearts: wish.hearts,
    is_pinned: Boolean(wish.isPinned),
  };

  const { data, error } = await sb
    .from('wishes')
    .insert(row)
    .select()
    .single();

  if (error || !data) {
    if (!isMissingTableError(error) && error) {
      console.warn('Supabase insert wish fallback:', error.message);
    }
    return null;
  }

  return mapWishRow(data as SupabaseWishRow);
}

export async function incrementWishHeartInSupabase(id: string): Promise<WishRecord | null> {
  const sb = getSupabaseClient();
  const { data: existing, error: fetchErr } = await sb
    .from('wishes')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (fetchErr || !existing) return null;

  const nextHearts = Number((existing as SupabaseWishRow).hearts || 0) + 1;
  const { data: updated, error: updateErr } = await sb
    .from('wishes')
    .update({ hearts: nextHearts })
    .eq('id', id)
    .select()
    .single();

  if (updateErr || !updated) return null;
  return mapWishRow(updated as SupabaseWishRow);
}

export async function updateMemoryInSupabase(
  id: string,
  params: {
    caption: string;
    authorName: string;
    relation: string;
    filePath?: string;
    filename?: string;
    mimeType?: string;
    kind?: 'photo' | 'video';
  }
): Promise<MemoryRecord | null> {
  const sb = getSupabaseClient();
  const patch: Record<string, unknown> = {
    caption: params.caption,
    author_name: params.authorName,
    relation: params.relation,
  };

  if (params.filePath && params.filename && params.mimeType && params.kind) {
    const storagePath = `uploads/${params.filename}`;
    const fileBuffer = fs.readFileSync(params.filePath);
    const { error: storageErr } = await sb.storage
      .from(SUPABASE_BUCKET)
      .upload(storagePath, fileBuffer, {
        contentType: params.mimeType,
        upsert: false,
      });

    if (storageErr) {
      console.warn('Supabase replacement media upload warning:', storageErr.message);
      return null;
    }

    patch.url = sb.storage.from(SUPABASE_BUCKET).getPublicUrl(storagePath).data.publicUrl;
    patch.storage_path = storagePath;
    patch.kind = params.kind;
  }

  const { data, error } = await sb
    .from('memories')
    .update(patch)
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error || !data) {
    if (!isMissingTableError(error) && error) {
      console.warn('Supabase update memory error:', error.message);
    }
    return null;
  }

  return mapMemoryRow(data as SupabaseMemoryRow);
}

export async function updateWishInSupabase(
  id: string,
  params: {
    authorName: string;
    relation: string;
    sticker: string;
    message: string;
  }
): Promise<WishRecord | null> {
  const sb = getSupabaseClient();
  const { data, error } = await sb
    .from('wishes')
    .update({
      author_name: params.authorName,
      relation: params.relation,
      sticker: params.sticker,
      message: params.message,
    })
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error || !data) {
    if (!isMissingTableError(error) && error) {
      console.warn('Supabase update wish error:', error.message);
    }
    return null;
  }

  return mapWishRow(data as SupabaseWishRow);
}
