import type { Difficulty } from "@/db/schema";

export const DIFFICULTIES: { value: Difficulty; label: string }[] = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];

const STYLE: Record<Difficulty, { label: string; bars: number; className: string }> = {
  easy: { label: "Easy", bars: 1, className: "bg-ok/15 text-ok" },
  medium: { label: "Medium", bars: 2, className: "bg-tang/15 text-tang" },
  hard: { label: "Hard", bars: 3, className: "bg-red/20 text-red-bright" },
};

/** How hard a show is: green Easy, orange Medium, red Hard, with one to three bars. */
export function DifficultyTag({ value, className = "" }: { value: Difficulty | null | undefined; className?: string }) {
  if (!value) return null;
  const { label, bars, className: tone } = STYLE[value];
  return (
    <span className={`tag shrink-0 ${tone} ${className}`}>
      <svg viewBox="0 0 12 10" width="12" height="10" aria-hidden className="shrink-0">
        {[0, 1, 2].map((i) => (
          <rect
            key={i}
            x={i * 4.5}
            y={6 - i * 3}
            width="3"
            height={4 + i * 3}
            rx="0.8"
            fill="currentColor"
            opacity={i < bars ? 1 : 0.3}
          />
        ))}
      </svg>
      <span className="sr-only">Difficulty: </span>
      {label}
    </span>
  );
}
