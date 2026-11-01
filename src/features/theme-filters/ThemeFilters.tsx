import { THEMES } from "../../domain/types";

type Props = {
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
};

export function ThemeFilters({ selected, onChange }: Props) {
  const toggle = (theme: string) => {
    const next = new Set(selected);
    if (next.has(theme)) next.delete(theme);
    else next.add(theme);
    onChange(next);
  };

  return (
    <div className="preferences">
      <span className="preferences-label">Thèmes</span>
      <div className="preferences-chips">
        {THEMES.map((theme) => (
          <button
            key={theme}
            type="button"
            className={`chip ${selected.has(theme) ? "chip--on" : ""}`}
            aria-pressed={selected.has(theme)}
            onClick={() => toggle(theme)}
          >
            {theme}
          </button>
        ))}
        <button
          type="button"
          className="chip chip--reset"
          onClick={() => onChange(new Set(THEMES))}
        >
          Réinitialiser
        </button>
      </div>
    </div>
  );
}
