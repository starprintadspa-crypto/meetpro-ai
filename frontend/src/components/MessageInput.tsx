import { useEffect, useRef, useState, type FormEvent } from "react";
import { Send } from "lucide-react";
import { CHAT_MAX_LENGTH, REACTION_EMOJIS, type ReactionEmoji } from "../types/chat";

const TYPING_STOP_DELAY_MS = 2000;

interface MessageInputProps {
  disabled: boolean;
  onSend: (text: string) => Promise<boolean>;
  onTyping: (isTyping: boolean) => void;
  onReaction: (emoji: ReactionEmoji) => void;
}

export default function MessageInput({ disabled, onSend, onTyping, onReaction }: MessageInputProps) {
  const [text, setText] = useState("");
  const typingActiveRef = useRef(false);
  const typingTimerRef = useRef<number | undefined>(undefined);

  const stopTyping = () => {
    window.clearTimeout(typingTimerRef.current);
    if (typingActiveRef.current) {
      typingActiveRef.current = false;
      onTyping(false);
    }
  };

  // Component unmount par typing indicator band karein
  useEffect(() => () => stopTyping(), []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = (value: string) => {
    setText(value);
    if (disabled) return;
    if (value.trim().length === 0) {
      stopTyping();
      return;
    }
    if (!typingActiveRef.current) {
      typingActiveRef.current = true;
      onTyping(true);
    }
    window.clearTimeout(typingTimerRef.current);
    typingTimerRef.current = window.setTimeout(stopTyping, TYPING_STOP_DELAY_MS);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || disabled) return;

    stopTyping();
    setText("");
    const ok = await onSend(trimmed);
    // Send fail hua to text wapas dein, taake user dobara bhej sake
    if (!ok) setText((current) => (current === "" ? trimmed : current));
  };

  return (
    <div className="border-t border-navy-800/10 bg-white p-2">
      <div className="mb-2 flex items-center gap-1 overflow-x-auto" role="group" aria-label="Quick reactions">
        {REACTION_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            disabled={disabled}
            onClick={() => onReaction(emoji)}
            aria-label={`Send reaction ${emoji}`}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-lg transition hover:bg-navy-800/10 disabled:opacity-40"
          >
            {emoji}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => handleChange(e.target.value)}
          maxLength={CHAT_MAX_LENGTH}
          disabled={disabled}
          placeholder={disabled ? "Reconnect hone ka intezar..." : "Message likhein..."}
          aria-label="Chat message"
          className="min-w-0 flex-1 rounded-full border border-navy-800/20 px-4 py-2 text-sm text-navy-900 focus:border-brand-500 focus:outline-none disabled:bg-navy-800/5"
        />
        <button
          type="submit"
          disabled={disabled || text.trim().length === 0}
          aria-label="Send message"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-500 text-white transition hover:bg-brand-600 disabled:opacity-40"
        >
          <Send className="h-4 w-4" aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}
