import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CatalogImageUrlInput } from '../components/CatalogImageUrlInput';
import { useLanguage } from '../context/LanguageContext';
import { getMyProfile } from '../services/profile';
import type { CatalogUploadFolder } from '../services/storageUpload';

const FOLDERS: CatalogUploadFolder[] = ['products', 'games', 'home', 'misc'];

export function AdminCatalogUpload() {
  const { t } = useLanguage();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [folder, setFolder] = useState<CatalogUploadFolder>('products');
  const [imageUrl, setImageUrl] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const p = await getMyProfile();
      if (!cancelled) {
        setIsAdmin(p?.role === 'admin');
        setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function copyUrl() {
    if (!imageUrl) return;
    try {
      await navigator.clipboard.writeText(imageUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  if (checking) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[40vh] text-on-surface-variant">
        {t('loading')}
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex-1 max-w-lg mx-auto px-6 py-20 text-center space-y-4">
        <p className="text-white font-bold text-lg">{t('adminCatalogUploadDenied')}</p>
        <p className="text-sm text-on-surface-variant">{t('adminCatalogUploadDeniedHint')}</p>
        <Link to="/" className="inline-block text-[--color-primary] font-bold uppercase tracking-widest text-sm">
          {t('home')}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-xl mx-auto px-6 py-12 space-y-8">
      <div>
        <h1 className="text-2xl font-black text-white uppercase tracking-tight">{t('adminCatalogUploadTitle')}</h1>
        <p className="mt-2 text-sm text-on-surface-variant leading-relaxed">{t('adminCatalogUploadIntro')}</p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-bold text-[--color-on-surface-variant] block">{t('imageUploadFolder')}</label>
        <select
          value={folder}
          onChange={(e) => setFolder(e.target.value as CatalogUploadFolder)}
          className="h-12 w-full rounded-xl bg-[--color-surface-container] border border-[--color-ghost-border] text-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[--color-primary]/30"
        >
          {FOLDERS.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </div>

      <CatalogImageUrlInput label={t('imageUploadLabel')} value={imageUrl} onChange={setImageUrl} uploadFolder={folder} />

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void copyUrl()}
          disabled={!imageUrl}
          className="px-6 py-3 rounded-xl bg-[--color-primary] text-white font-bold text-sm uppercase tracking-widest disabled:opacity-40"
        >
          {copied ? t('imageUploadCopied') : t('imageUploadCopyUrl')}
        </button>
      </div>
    </div>
  );
}
