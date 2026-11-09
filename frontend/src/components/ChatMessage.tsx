import type { TimelineItem } from "../types/chat";

const URL_PATTERN = /(https?:\/\/[^\s<>"']+)/g;

// Sirf http/https links banate hain. Baaki text React ke zariye escape hota hai (XSS safe).
function renderText(text: string) {
  return text.split(URL_PATTERN).map((part, index) =>
    /^https?:\/\//.test(part) ? (
      <a
        key={index}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className="break-all underline underline-offset-2 hover:opacity-80"
      >
        {part}
      </a>
    ) : (
      <span key={index}>{part}</span>
    )
  );
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

interface ChatMessageProps {
  item: TimelineItem;
  selfId: string | null;
}

export default function ChatMessage({ item, selfId }: ChatMessageProps) {
  if (item.kind === "system") {
    return (
      <p className="my-2 text-center text-xs text-navy-700/70">
        {item.text} · {formatTime(item.at)}
      </p>
    );
  }

  if (item.kind === "reaction") {
    return (
      <p className="my-2 text-center text-sm text-navy-800">
        <span className="font-medium">{item.displayName}</span> ne react kiya{" "}
        <span className="text-base" aria-label="reaction">
          {item.emoji}
        </span>
      </p>
    );
  }

  const isOwn = item.senderId === selfId;
  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
          isOwn ? "rounded-br-sm bg-brand-500 text-white" : "rounded-bl-sm bg-navy-800/5 text-navy-900"
        }`}
      >
        {!isOwn && <p className="mb-0.5 text-xs font-semibold text-brand-700">{item.senderName}</p>}
        <p className="whitespace-pre-wrap break-words">{renderText(item.message)}</p>
        <p className={`mt-1 text-right text-[10px] ${isOwn ? "text-white/70" : "text-navy-700/60"}`}>
          {formatTime(item.createdAt)}
        </p>
      </div>
    </div>
  );
}
