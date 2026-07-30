export default function SectionHead({ title, action, onAction }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <div className="text-sm font-extrabold uppercase tracking-wide text-orange">{title}</div>
      {action && (
        <button onClick={onAction} className="flex items-center gap-0.5 text-xs font-bold text-orange">
          {action}
        </button>
      )}
    </div>
  );
}
