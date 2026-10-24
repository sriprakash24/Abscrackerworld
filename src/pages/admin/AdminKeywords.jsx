import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Tags, Loader2, ImageOff, Search, CheckCircle2, X, RotateCcw } from 'lucide-react';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { useProducts } from '../../contexts/ProductsContext';
import { bulkUpdateProductKeywords } from '../../services/products';
import AdminSectionHeader from '../../components/admin/AdminSectionHeader';
import AdminTabsNav from '../../components/admin/AdminTabsNav';

/**
 * Keywords — give each product extra search words (nicknames, Tamil /
 * Tanglish spellings, short forms) so it's quick to find in the manual
 * invoice product picker. Type a word and press Enter or comma to add it,
 * tap × to remove. Edits across ALL categories are held locally and saved
 * together with one "Save changes" click.
 */
export default function AdminKeywords() {
  const { user, logout } = useAdminAuth();
  const navigate = useNavigate();
  const { products, loading } = useProducts();

  const [category, setCategory] = useState('ALL');
  const [search, setSearch] = useState('');
  const [onlyMissing, setOnlyMissing] = useState(false);
  const [edits, setEdits] = useState({}); // { [productId]: string[] } — full keyword list for edited products
  const [saving, setSaving] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/admin/login', { replace: true });
    } catch (err) {
      console.error('Logout failed', err);
      toast.error('Could not sign out. Please try again.');
    }
  };

  const keywordsOf = (p) => edits[p.id] ?? p.keywords ?? [];

  const categories = useMemo(() => {
    const names = [];
    products.forEach((p) => {
      if (p.category && !names.includes(p.category)) names.push(p.category);
    });
    return names;
  }, [products]);

  const missingByCategory = useMemo(() => {
    const counts = {};
    products.forEach((p) => {
      if (!(edits[p.id] ?? p.keywords ?? []).length) counts[p.category] = (counts[p.category] || 0) + 1;
    });
    return counts;
  }, [products, edits]);

  const visible = useMemo(() => {
    const tokens = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return products
      .filter((p) => (tokens.length || category === 'ALL' ? true : p.category === category))
      .filter((p) => {
        if (!tokens.length) return true;
        const hay = [p.name, p.nameTa, p.category, ...(edits[p.id] ?? p.keywords ?? [])].join(' ').toLowerCase();
        return tokens.every((t) => hay.includes(t));
      })
      .filter((p) => !onlyMissing || !(edits[p.id] ?? p.keywords ?? []).length)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [products, category, search, onlyMissing, edits]);

  const sameList = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

  const setKeywords = (product, list) => {
    setEdits((prev) => {
      const next = { ...prev };
      if (sameList(list, product.keywords || [])) delete next[product.id];
      else next[product.id] = list;
      return next;
    });
  };

  const changedIds = Object.keys(edits);

  const saveChanges = async () => {
    setSaving(true);
    try {
      await bulkUpdateProductKeywords(changedIds.map((id) => ({ id, keywords: edits[id] })));
      toast.success(`Saved keywords for ${changedIds.length} ${changedIds.length === 1 ? 'product' : 'products'}`);
      setEdits({});
    } catch (err) {
      console.error('Saving keywords failed', err);
      toast.error("Couldn't save keywords. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const totalMissing = products.filter((p) => !(edits[p.id] ?? p.keywords ?? []).length).length;

  return (
    <div className="min-h-screen w-full bg-bg pb-44 text-brown">
      <AdminSectionHeader
        icon={Tags}
        title="Keywords"
        subtitle={`${totalMissing} of ${products.length} products have no keywords yet`}
        email={user?.email}
        onLogout={handleLogout}
      />
      <AdminTabsNav />

      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-5 sm:px-6">
        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 md:grid-cols-6">
          <Chip active={category === 'ALL'} onClick={() => setCategory('ALL')} label={`All (${products.length})`} />
          {categories.map((c) => (
            <Chip
              key={c}
              active={category === c}
              onClick={() => setCategory(c)}
              label={c}
              badge={missingByCategory[c]}
            />
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="surface-3d flex flex-1 items-center gap-2 rounded-xl px-3.5 py-2.5">
            <Search size={14} className="shrink-0 text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products or keywords…"
              className="w-full bg-transparent text-[12.5px] font-semibold text-brown outline-none placeholder:text-muted placeholder:font-normal"
            />
          </div>
          <button
            type="button"
            onClick={() => setOnlyMissing((v) => !v)}
            className={`shrink-0 rounded-xl border px-3 py-2.5 text-[11px] font-bold transition-colors ${
              onlyMissing ? 'border-orange/50 bg-orange/15 text-orange' : 'border-brown/12 bg-white text-muted'
            }`}
          >
            No keywords
          </button>
        </div>

        <div className="flex flex-col gap-2.5">
          {loading ? (
            <div className="surface-3d flex items-center justify-center gap-2 rounded-2xl px-4 py-8 text-[12px] text-muted">
              <Loader2 size={14} className="animate-spin" /> Loading products…
            </div>
          ) : visible.length === 0 ? (
            <div className="surface-3d rounded-2xl px-4 py-8 text-center text-[12px] text-muted">No products found.</div>
          ) : (
            visible.map((product) => (
              <KeywordRow
                key={product.id}
                product={product}
                keywords={keywordsOf(product)}
                changed={product.id in edits}
                onChange={(list) => setKeywords(product, list)}
                onRevert={() =>
                  setEdits((prev) => {
                    const next = { ...prev };
                    delete next[product.id];
                    return next;
                  })
                }
              />
            ))
          )}
        </div>
      </div>

      {changedIds.length > 0 && (
        <div className="fixed inset-x-0 bottom-20 z-40 border-t border-orange/30 bg-bg/95 px-4 py-3 backdrop-blur-sm sm:px-6">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
            <p className="text-[12px] font-semibold text-brown">
              <span className="font-extrabold text-orange">{changedIds.length}</span>{' '}
              {changedIds.length === 1 ? 'product' : 'products'} changed
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setEdits({})}
                disabled={saving}
                className="btn-3d-outline rounded-xl px-4 py-2.5 text-[12px] font-bold text-brown disabled:opacity-50"
              >
                Discard
              </button>
              <button
                onClick={saveChanges}
                disabled={saving}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-b from-[#e35226] to-[#b8391a] px-4 py-2.5 text-[12px] font-bold text-white shadow-[0_8px_18px_-8px_rgba(227,82,38,0.55)] transition-transform active:scale-[0.97] disabled:opacity-50"
              >
                {saving ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                Save changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Chip({ active, onClick, label, badge }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={`relative flex min-w-0 items-center justify-center rounded-lg border px-1.5 py-1.5 text-[10.5px] font-bold leading-tight transition-colors ${
        active ? 'border-orange/60 bg-orange/15 text-orange' : 'border-brown/12 bg-white text-muted'
      }`}
    >
      <span className="truncate">{label}</span>
      {badge > 0 && (
        <span
          title="Products without keywords"
          className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#e35226] px-1 text-[9px] font-extrabold text-white"
        >
          {badge}
        </span>
      )}
    </button>
  );
}

function KeywordRow({ product, keywords, changed, onChange, onRevert }) {
  const [draft, setDraft] = useState('');

  const addFromDraft = () => {
    const parts = draft
      .split(/[,\n]/)
      .map((t) => t.trim())
      .filter(Boolean);
    setDraft('');
    if (!parts.length) return;
    const existing = new Set(keywords.map((k) => k.toLowerCase()));
    const merged = [...keywords];
    parts.forEach((t) => {
      if (!existing.has(t.toLowerCase())) {
        existing.add(t.toLowerCase());
        merged.push(t);
      }
    });
    onChange(merged);
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addFromDraft();
    } else if (e.key === 'Backspace' && !draft && keywords.length) {
      onChange(keywords.slice(0, -1));
    }
  };

  return (
    <div className={`surface-3d flex items-start gap-3 rounded-2xl p-3 ${changed ? 'ring-1 ring-orange/50' : ''}`}>
      <div className="orb-3d flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden !rounded-xl">
        {product.img ? (
          <img src={product.img} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <ImageOff size={14} className="text-muted" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-[12.5px] font-bold text-brown">{product.name}</p>
            <p className="truncate text-[10.5px] font-semibold text-muted">
              {product.category}
              {product.nameTa ? <span className="text-gold"> · {product.nameTa}</span> : null}
              {product.hidden ? ' · hidden' : ''}
            </p>
          </div>
          {changed && (
            <button
              type="button"
              onClick={onRevert}
              title="Undo changes"
              className="orb-3d flex h-7 w-7 shrink-0 items-center justify-center !rounded-full text-muted hover:text-orange"
            >
              <RotateCcw size={11} />
            </button>
          )}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-1.5 rounded-xl border border-brown/12 bg-white px-2 py-1.5 focus-within:border-orange/60">
          {keywords.map((k) => (
            <span
              key={k}
              className="flex items-center gap-1 rounded-full border border-orange/30 bg-orange/10 py-0.5 pl-2 pr-1 text-[10.5px] font-bold text-orange"
            >
              {k}
              <button
                type="button"
                onClick={() => onChange(keywords.filter((x) => x !== k))}
                aria-label={`Remove ${k}`}
                className="flex h-4 w-4 items-center justify-center rounded-full hover:bg-orange/20"
              >
                <X size={9} />
              </button>
            </span>
          ))}
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            onBlur={addFromDraft}
            placeholder={keywords.length ? 'Add another…' : 'Type a keyword, press Enter'}
            className="min-w-[120px] flex-1 bg-transparent py-0.5 text-[11.5px] font-semibold text-brown outline-none placeholder:font-normal placeholder:text-muted"
          />
        </div>
      </div>
    </div>
  );
}
