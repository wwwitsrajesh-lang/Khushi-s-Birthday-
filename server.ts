import 'dotenv/config';
import crypto from 'crypto';
import express from 'express';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  fetchMemoriesFromSupabase,
  fetchWishesFromSupabase,
  incrementMemoryHeartInSupabase,
  incrementWishHeartInSupabase,
  MemoryRecord,
  saveMemoryToSupabase,
  saveWishToSupabase,
  sortWishes,
  syncLocalSeedToSupabase,
  WishRecord,
} from './server/supabase.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = path.resolve(__dirname, 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const DB_FILE = path.join(DATA_DIR, 'db.json');

interface BirthdayDatabase {
  memories: MemoryRecord[];
  wishes: WishRecord[];
}

function ensureStorageReady(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    const initialDb: BirthdayDatabase = {
      memories: [
        {
          id: 'khushi-mem-video-1',
          kind: 'video',
          url: '/assets/aistudio/v_a804cbbb.mp4',
          caption: 'Happy Birthday Simran! A special video tribute filled with smiles, karate spirit, and joyful childhood memories.',
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
          caption: 'Happy Birthday Khushi Mama — May all your dreams come true, stay happy always, you are so special!',
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
          caption: 'Happy Birthday Khushi Mama — Celebrating together with roses, candlelight, and birthday cake.',
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
          caption: 'From martial arts strength and creative projects to radiant smiles among the flowers.',
          authorName: 'Shining Moments',
          relation: 'Memory Collage',
          createdAt: '2026-11-16T07:15:00.000Z',
          hearts: 25,
          isFeatured: true,
        },
      ],
      wishes: [
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
      ],
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2), 'utf8');
  }
}

function readDb(): BirthdayDatabase {
  ensureStorageReady();
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    const parsed = JSON.parse(raw) as BirthdayDatabase;
    const memories = Array.isArray(parsed.memories) ? parsed.memories : [];
    const wishes = Array.isArray(parsed.wishes) ? parsed.wishes : [];
    if (wishes.length > 0 && !wishes.some((w) => w.isPinned)) {
      const seedPin = wishes.find((w) => w.id === 'seed-wish-1');
      if (seedPin) seedPin.isPinned = true;
    }
    return {
      memories,
      wishes: sortWishes(wishes),
    };
  } catch {
    return { memories: [], wishes: [] };
  }
}

function writeDb(db: BirthdayDatabase): void {
  ensureStorageReady();
  const tempFile = `${DB_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(tempFile, JSON.stringify(db, null, 2), 'utf8');
  fs.renameSync(tempFile, DB_FILE);
}

ensureStorageReady();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    ensureStorageReady();
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase() || '.bin';
    const safeExt = /^[a-z0-9.]+$/i.test(ext) ? ext : '.bin';
    const uniqueName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${safeExt}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100 MB per photo or video
  },
  fileFilter: (_req, file, cb) => {
    const isMedia =
      file.mimetype.startsWith('image/') ||
      file.mimetype.startsWith('video/');
    if (isMedia) {
      cb(null, true);
    } else {
      cb(new Error('Only image and video files are supported.'));
    }
  },
});

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  // Serve permanent uploaded photos and videos (supports range requests for video streaming)
  app.use(
    '/uploads',
    express.static(UPLOADS_DIR, {
      maxAge: '365d',
      immutable: true,
    })
  );

  // Serve public/assets/aistudio explicitly so uploaded media assets resolve in all environments
  const aistudioAssetsDir = path.resolve(__dirname, 'public', 'assets', 'aistudio');
  if (fs.existsSync(aistudioAssetsDir)) {
    app.use('/assets/aistudio', express.static(aistudioAssetsDir, { maxAge: '7d' }));
  }

  // Also serve src/assets/images in production so generated assets resolve cleanly
  const srcImagesDir = path.resolve(__dirname, 'src', 'assets', 'images');
  if (fs.existsSync(srcImagesDir)) {
    app.use('/src/assets/images', express.static(srcImagesDir, { maxAge: '7d' }));
  }

  // GET all permanent memories (photos & videos) from Supabase (fallback to local db)
  app.get('/api/memories', async (_req, res) => {
    const localDb = readDb();
    await syncLocalSeedToSupabase(__dirname, localDb.memories, localDb.wishes);
    const remoteMemories = await fetchMemoriesFromSupabase();
    res.json({ memories: remoteMemories ?? localDb.memories });
  });

  // POST permanent photo or video memory to Supabase Storage + Supabase DB
  app.post('/api/memories', upload.single('media'), async (req, res) => {
    try {
      const file = req.file;
      if (!file) {
        res.status(400).json({ error: 'Please select a photo or video file to upload.' });
        return;
      }

      const authorName = String(req.body.authorName || '').trim().slice(0, 80) || 'Loving Guest';
      const relation = String(req.body.relation || '').trim().slice(0, 60) || 'Family & Friends';
      const caption =
        String(req.body.caption || '').trim().slice(0, 320) ||
        'A joyful birthday memory saved forever for Simran (Khushi).';
      const kind: 'photo' | 'video' = file.mimetype.startsWith('video/') ? 'video' : 'photo';
      const id = `mem-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
      const createdAt = new Date().toISOString();

      const localDb = readDb();
      await syncLocalSeedToSupabase(__dirname, localDb.memories, localDb.wishes);

      const supabaseMemory = await saveMemoryToSupabase({
        id,
        kind,
        filePath: file.path,
        filename: file.filename,
        mimeType: file.mimetype,
        caption,
        authorName,
        relation,
        createdAt,
      });

      if (supabaseMemory) {
        // Remove temporary disk file once stored in Supabase Storage
        fs.promises.unlink(file.path).catch(() => {});
        res.status(201).json({ memory: supabaseMemory });
        return;
      }

      const newMemory: MemoryRecord = {
        id,
        kind,
        url: `/uploads/${file.filename}`,
        caption,
        authorName,
        relation,
        createdAt,
        hearts: 1,
        isFeatured: false,
      };

      localDb.memories.unshift(newMemory);
      writeDb(localDb);

      res.status(201).json({ memory: newMemory });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed.';
      res.status(500).json({ error: message });
    }
  });

  // POST heart reaction on a memory
  app.post('/api/memories/:id/heart', async (req, res) => {
    const { id } = req.params;
    const remoteUpdated = await incrementMemoryHeartInSupabase(id);
    if (remoteUpdated) {
      res.json({ memory: remoteUpdated });
      return;
    }

    const db = readDb();
    const target = db.memories.find((m) => m.id === id);
    if (!target) {
      res.status(404).json({ error: 'Memory not found.' });
      return;
    }
    target.hearts += 1;
    writeDb(db);
    res.json({ memory: target });
  });

  // GET all permanent birthday wishes from Supabase (fallback to local db)
  app.get('/api/wishes', async (_req, res) => {
    const localDb = readDb();
    await syncLocalSeedToSupabase(__dirname, localDb.memories, localDb.wishes);
    const remoteWishes = await fetchWishesFromSupabase();
    res.json({ wishes: remoteWishes ?? localDb.wishes });
  });

  // POST permanent birthday wish to Supabase
  app.post('/api/wishes', async (req, res) => {
    const authorName = String(req.body?.authorName || '').trim().slice(0, 80);
    const relation = String(req.body?.relation || '').trim().slice(0, 60) || 'Family & Friends';
    const sticker = String(req.body?.sticker || '🎂').trim().slice(0, 8) || '🎂';
    const message = String(req.body?.message || '').trim().slice(0, 800);

    if (!authorName || !message) {
      res.status(400).json({ error: 'Please include both your name and a birthday message.' });
      return;
    }

    const newWish: WishRecord = {
      id: `wish-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
      authorName,
      relation,
      sticker,
      message,
      createdAt: new Date().toISOString(),
      hearts: 1,
      isPinned: false,
    };

    const localDb = readDb();
    await syncLocalSeedToSupabase(__dirname, localDb.memories, localDb.wishes);

    const supabaseWish = await saveWishToSupabase(newWish);
    if (supabaseWish) {
      res.status(201).json({ wish: supabaseWish });
      return;
    }

    localDb.wishes = sortWishes([newWish, ...localDb.wishes]);
    writeDb(localDb);

    res.status(201).json({ wish: newWish });
  });

  // POST heart reaction on a birthday wish
  app.post('/api/wishes/:id/heart', async (req, res) => {
    const { id } = req.params;
    const remoteUpdated = await incrementWishHeartInSupabase(id);
    if (remoteUpdated) {
      res.json({ wish: remoteUpdated });
      return;
    }

    const db = readDb();
    const target = db.wishes.find((w) => w.id === id);
    if (!target) {
      res.status(404).json({ error: 'Wish not found.' });
      return;
    }
    target.hearts += 1;
    writeDb(db);
    res.json({ wish: target });
  });

  // Ensure unknown /api/* routes never fall through to HTML SPA fallback
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'API route not found.' });
  });

  // Multer / API error middleware
  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const message = err instanceof Error ? err.message : 'Unexpected server error.';
    res.status(400).json({ error: message });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Birthday celebration server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
