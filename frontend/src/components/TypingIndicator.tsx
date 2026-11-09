interface TypingIndicatorProps {
  names: string[];
}

export default function TypingIndicator({ names }: TypingIndicatorProps) {
  if (names.length === 0) return null;

  let label: string;
  if (names.length === 1) label = `${names[0]} likh rahe hain...`;
  else if (names.length === 2) label = `${names[0]} aur ${names[1]} likh rahe hain...`;
  else label = "Kai log likh rahe hain...";

  return (
    <div className="flex items-center gap-2 px-3 pb-1 text-xs text-navy-700" aria-live="polite">
      <span className="flex gap-0.5" aria-hidden="true">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-navy-700/60 [animation-delay:-0.3s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-navy-700/60 [animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-navy-700/60" />
      </span>
      <span>{label}</span>
    </div>
  );
}
