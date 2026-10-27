import type { ActivityCategory, UserPreferences } from "../types";
import { ACTIVITY_CATEGORIES } from "../types";

type Props = {
  preferences: UserPreferences;
  onChange: (next: UserPreferences) => void;
};

export function PreferencesBar({ preferences, onChange }: Props) {
  const toggle = (id: ActivityCategory) => {
    onChange({ ...preferences, [id]: !preferences[id] });
  };

  return (
    <div className="preferences">
      <span className="preferences-label">Centres d&apos;intérêt</span>
      <div className="preferences-chips">
        {ACTIVITY_CATEGORIES.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            className={`chip ${preferences[id] ? "chip--on" : ""}`}
            onClick={() => toggle(id)}
            aria-pressed={preferences[id]}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
