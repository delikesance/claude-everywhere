export interface FollowUpsProps {
  suggestions: string[];
  onPick: (suggestion: string) => void;
}

export function FollowUps({ suggestions, onPick }: FollowUpsProps) {
  if (suggestions.length === 0) return null;
  return (
    <div class="suggestions">
      {suggestions.map((text, index) => (
        <button
          key={index}
          type="button"
          class="suggestion anim-rise"
          style={{ "--i": String(index) }}
          onClick={() => onPick(text)}
        >
          {text}
        </button>
      ))}
    </div>
  );
}
