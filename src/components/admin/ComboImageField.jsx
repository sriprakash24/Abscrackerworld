import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, UploadCloud, ImageOff, X } from 'lucide-react';
import { uploadComboImageFile } from '../../services/products';

/**
 * Image picker used all over the combo form: paste a URL or upload a file
 * (goes to Firebase Storage under combos/). `value` is what gets saved
 * (URL or Storage path); `previewSrc` is what to show if it differs
 * (e.g. a Storage path resolved to a URL on the storefront).
 */
export default function ComboImageField({
  label,
  hint,
  value,
  previewSrc,
  onChange,
  compact = false,
  wide = false,
}) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [localPreview, setLocalPreview] = useState('');

  const shown = localPreview || (/^https?:\/\/|^data:|^blob:/i.test(value || '') ? value : previewSrc) || '';

  const pick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadComboImageFile(file);
      setLocalPreview(url);
      onChange(url);
      toast.success('Image uploaded');
    } catch (err) {
      console.error('Combo image upload failed', err);
      toast.error("Couldn't upload the image. Please try again.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const size = compact ? 'h-11 w-11' : wide ? 'h-24 w-24' : 'h-16 w-16';

  return (
    <div>
      {label && <span className="mb-1.5 block text-[11px] font-bold tracking-wide text-muted">{label}</span>}
      <div className="flex items-center gap-2.5">
        <div className={`orb-3d relative flex ${size} shrink-0 items-center justify-center overflow-hidden !rounded-xl`}>
          {shown ? (
            <img src={shown} alt="" className={`h-full w-full ${wide ? 'object-contain' : 'object-cover'}`} />
          ) : (
            <ImageOff size={compact ? 13 : 16} className="text-muted" />
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <input
            value={value || ''}
            onChange={(e) => {
              setLocalPreview('');
              onChange(e.target.value);
            }}
            placeholder="Paste an image URL…"
            className="w-full rounded-lg border border-brown/15 bg-white px-2.5 py-1.5 text-[11.5px] font-semibold text-brown outline-none placeholder:font-normal placeholder:text-muted focus:border-red/60"
          />
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="btn-3d-outline flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-1 text-[10.5px] font-bold disabled:opacity-50"
            >
              {uploading ? <Loader2 size={11} className="animate-spin" /> : <UploadCloud size={11} />}
              {uploading ? 'Uploading…' : 'Upload'}
            </button>
            {value && (
              <button
                type="button"
                onClick={() => {
                  setLocalPreview('');
                  onChange('');
                }}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10.5px] font-bold text-[#e35226] hover:bg-[#e35226]/10"
              >
                <X size={11} /> Remove
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={pick} className="hidden" />
        </div>
      </div>
      {hint && <p className="mt-1.5 text-[10px] font-medium leading-relaxed text-muted">{hint}</p>}
    </div>
  );
}
