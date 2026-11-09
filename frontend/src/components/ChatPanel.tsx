import { useEffect, useRef, useState } from "react";
import { Users, MessageSquare, X } from "lucide-react";
import ChatMessage from "./ChatMessage";
import ConnectionStatus from "./ConnectionStatus";
import MessageInput from "./MessageInput";
import ParticipantList from "./ParticipantList";
import TypingIndicator from "./TypingIndicator";
import type { ConnectionState, Participant, ReactionEmoji, TimelineItem } from "../types/chat";

type PanelTab = "chat" | "people";

interface ChatPanelProps {
  timeline: TimelineItem[];
  participants: Participant[];
  selfId: string | null;
  typingNames: string[];
  connectionState: ConnectionState;
  notice: string | null;
  onDismissNotice: () => void;
  onSend: (text: string) => Promise<boolean>;
  onTyping: (isTyping: boolean) => void;
  onReaction: (emoji: ReactionEmoji) => void;
  onClose: () => void;
}

export default function ChatPanel({
  timeline,
  participants,
  selfId,
  typingNames,
  connectionState,
  notice,
  onDismissNotice,
  onSend,
  onTyping,
  onReaction,
  onClose,
}: ChatPanelProps) {
  const [tab, setTab] = useState<PanelTab>("chat");
  const listRef = useRef<HTMLDivElement>(null);
  const inputDisabled = connectionState !== "connected";

  // Naya item aaye to list neeche scroll ho
  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTo({ top: list.scrollHeight, behavior: "smooth" });
  }, [timeline.length, tab]);

  const tabClass = (active: boolean) =>
    `flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
      active ? "bg-brand-500 text-white" : "text-navy-700 hover:bg-navy-800/5"
    }`;

  return (
    <div className="flex h-full min-h-0 flex-col bg-white text-navy-900">
      <header className="border-b border-navy-800/10 px-4 py-3">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-semibold">
            <MessageSquare className="h-4 w-4 text-brand-500" aria-hidden="true" />
            Meeting chat
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close chat"
            className="rounded-lg p-1.5 hover:bg-navy-800/10"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="flex items-center justify-between gap-2">
          <ConnectionStatus state={connectionState} />
          <div className="flex w-full max-w-[200px] gap-1 rounded-lg bg-navy-800/5 p-1" role="tablist">
            <button type="button" role="tab" aria-selected={tab === "chat"} onClick={() => setTab("chat")} className={tabClass(tab === "chat")}>
              Chat
            </button>
            <button type="button" role="tab" aria-selected={tab === "people"} onClick={() => setTab("people")} className={tabClass(tab === "people")}>
              <span className="inline-flex items-center gap-1">
                <Users className="h-3.5 w-3.5" aria-hidden="true" />
                {participants.length}
              </span>
            </button>
          </div>
        </div>
      </header>

      {notice && (
        <div role="alert" className="flex items-start justify-between gap-2 bg-amber-50 px-4 py-2 text-xs text-amber-800">
          <span>{notice}</span>
          <button type="button" onClick={onDismissNotice} aria-label="Dismiss notice" className="shrink-0 font-bold">
            ×
          </button>
        </div>
      )}

      {tab === "chat" ? (
        <>
          <div ref={listRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-3">
            {timeline.length === 0 ? (
              <p className="pt-8 text-center text-sm text-navy-700/70">Abhi koi message nahi. Pehla message bhejein!</p>
            ) : (
              timeline.map((item) => <ChatMessage key={item.key} item={item} selfId={selfId} />)
            )}
          </div>
          <TypingIndicator names={typingNames} />
          <MessageInput
            disabled={inputDisabled}
            onSend={onSend}
            onTyping={onTyping}
            onReaction={onReaction}
          />
        </>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <ParticipantList participants={participants} selfId={selfId} />
        </div>
      )}
    </div>
  );
}
