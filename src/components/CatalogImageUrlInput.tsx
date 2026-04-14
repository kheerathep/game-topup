import { useId, useState, type ChangeEvent } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { uploadCatalogImage, type CatalogUploadFolder } from '../services/storageUpload';
import { cn } from '../lib/utils';

type Props = {
  label?: string;
  value: string;
  onChange: (url: string) => void;
  uploadFolder: CatalogUploadFolder;
  disabled?: boolean;
  className?: string;
};

export function CatalogImageUrlInput({ label, value, onChange, uploadFolder, disabled, className }: Props) {
  const { t } = useLanguage();
  const inputId = useId();
  const fileId = useId();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFilePick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const url = await uploadCatalogImage(file, uploadFolder);
      onChange(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('imageUploadFailed'));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className={cn('space-y-2 w-full', className)}>
      {label && (
        <label htmlFor={inputId} className="text-sm font-bold text-[--color-on-surface-variant] block">
          {label}
        </label>
      )}
      <input
        id={inputId}
        type="url"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="https://..."
        disabled={disabled || uploading}
        className={cn(
          'flex h-12 w-full rounded-xl bg-[--color-surface-container] px-3 py-2 text-sm text-white',
          'border border-[--color-ghost-border] placeholder:text-[--color-outline-variant]',
          'focus:border-[--color-primary]/50 focus:outline-none focus:ring-2 focus:ring-[--color-primary]/25',
          'disabled:opacity-50',
        )}
      />
      <div className="flex flex-wrap items-center gap-3">
        <input id={fileId} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={onFilePick} disabled={disabled || uploading} />
        <label
          htmlFor={fileId}
          className={cn(
            'inline-flex cursor-pointer items-center justify-center rounded-xl border px-4 py-2.5 text-xs font-bold uppercase tracking-widest transition-colors',
            'border-[--color-ghost-border] bg-[--color-surface-container-high] text-white hover:border-[--color-primary]/45',
            (disabled || uploading) && 'pointer-events-none opacity-50',
          )}
        >
          {uploading ? t('imageUploading') : t('imageUploadChooseFile')}
        </label>
        <span className="text-[11px] text-[--color-outline-variant]">{t('imageUploadOrPaste')}</span>
      </div>
      {error && <p className="text-sm text-[--color-error]">{error}</p>}
      {value ? (
        <div className="mt-2 rounded-xl border border-[--color-ghost-border] overflow-hidden bg-black/20 max-w-xs">
          <img src={value} alt="" className="w-full h-40 object-cover" />
        </div>
      ) : null}
    </div>
  );
}
