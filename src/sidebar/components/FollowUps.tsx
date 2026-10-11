export interface FollowUpsProps {
  suggestions: string[];
  onPick: (suggestion: string) => void;
}

export function FollowUps({ suggestions, onPick }: FollowUpsProps) {
  if (suggestions.length === 0) return null;
  return (
    <div class="followups">
      {suggestions.map((text, index) => (
        <button
          key={index}
          type="button"
          class="followup anim-rise"
          style={{ "--i": String(index) }}
          onClick={() => onPick(text)}
        >
          {text}
        </button>
      ))}
    </div>
  );
}
