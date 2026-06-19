"use client";

interface FilterDropdownProps {
  label: string;
  summary: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  hasSelection: boolean;
  onClear: () => void;
}

export default function FilterDropdown({
  label, summary, isOpen, onToggle, children, hasSelection, onClear,
}: FilterDropdownProps) {
  return (
    <div className="sb-fd">
      <button
        className={`sb-fd-header${hasSelection ? " sb-fd-header--active" : ""}`}
        onClick={onToggle}
        aria-expanded={isOpen}
      >
        <span className="sb-fd-label">{label}</span>
        <span className={`sb-fd-summary${hasSelection ? " sb-fd-summary--active" : ""}`}>
          {summary}
        </span>
        {hasSelection && (
          <button
            className="sb-fd-clear"
            onClick={e => { e.stopPropagation(); onClear(); }}
            aria-label={`Clear ${label} filter`}
          >Clear</button>
        )}
        <span className={`sb-fd-chevron${isOpen ? " sb-fd-chevron--open" : ""}`} aria-hidden="true">▸</span>
      </button>
      {isOpen && (
        <div className="sb-fd-body">
          {children}
        </div>
      )}
    </div>
  );
}
