import { Loader2, Save } from 'lucide-react';

export default function SaveProfileButton({ loading }) {
  return (
    <div className="sticky bottom-0 z-30 px-4 pb-4 pt-3">
      <div
        className="panel-3d rounded-2xl p-2.5"
        style={{ background: 'linear-gradient(180deg, rgba(5,5,5,0) 0%, rgba(5,5,5,0.92) 40%)' }}
      >
        <button
          type="submit"
          disabled={loading}
          className={`btn-3d flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-[13.5px] font-extrabold tracking-wide text-black transition-opacity ${
            loading ? 'cursor-not-allowed opacity-50' : ''
          }`}
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save size={16} />
              Save Changes
            </>
          )}
        </button>
      </div>
    </div>
  );
}
