CREATE TABLE IF NOT EXISTS public.memories (
  id text PRIMARY KEY,
  kind text NOT NULL,
  url text NOT NULL,
  storage_path text,
  caption text NOT NULL,
  author_name text NOT NULL,
  relation text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  hearts integer NOT NULL DEFAULT 1,
  is_featured boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.wishes (
  id text PRIMARY KEY,
  author_name text NOT NULL,
  relation text NOT NULL,
  sticker text NOT NULL DEFAULT '🎂',
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  hearts integer NOT NULL DEFAULT 1,
  is_pinned boolean NOT NULL DEFAULT false
);

ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_memories_all" ON public.memories;
CREATE POLICY "public_memories_all" ON public.memories FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_wishes_all" ON public.wishes;
CREATE POLICY "public_wishes_all" ON public.wishes FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

INSERT INTO storage.buckets (id, name, public)
VALUES ('birthday-media', 'birthday-media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "public_media_all" ON storage.objects;
CREATE POLICY "public_media_all" ON storage.objects FOR ALL TO anon, authenticated USING (bucket_id = 'birthday-media') WITH CHECK (bucket_id = 'birthday-media');
