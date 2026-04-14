import { supabase } from './supabase';

const BUCKET = 'catalog';

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_PREFIX = /^image\/(jpeg|png|webp|gif)$/i;

export type CatalogUploadFolder = 'products' | 'games' | 'home' | 'misc';

function supabaseRequired(): Error {
  return new Error(
    'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.',
  );
}

/**
 * อัปโหลดรูปไป bucket `catalog` แล้วคืน public URL ไปเก็บใน image_url
 * ต้องล็อกอิน + role admin (ตาม patch_storage_catalog.sql)
 */
export async function uploadCatalogImage(file: File, folder: CatalogUploadFolder): Promise<string> {
  if (!supabase) throw supabaseRequired();
  if (!ALLOWED_PREFIX.test(file.type)) {
    throw new Error('Use JPEG, PNG, WebP, or GIF.');
  }
  if (file.size > MAX_BYTES) {
    throw new Error('Image must be 5 MB or smaller.');
  }

  const safeBase = file.name.replace(/[^\w.\-]/g, '_').slice(0, 120);
  const path = `${folder}/${crypto.randomUUID()}-${safeBase}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '31536000',
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
