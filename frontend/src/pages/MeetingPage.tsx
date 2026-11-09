import { useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { Check, Copy, MessageSquare, Video } from "lucide-react";
import ChatPanel from "../components/ChatPanel";
import JitsiMeeting from "../components/JitsiMeeting";
import { useMeetingChat } from "../hooks/useMeetingChat";
import { config } from "../utils/config";
import { buildInviteLink, parseRoomInput } from "../utils/room";

interface MeetingLocationState {
  displayName?: string;
}

export default function MeetingPage() {
  const { roomId: rawRoomId = "" } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  const roomId = parseRoomInput(rawRoomId);
  const state = location.state as MeetingLocationState | null;
  const displayName = state?.displayName?.trim() || "Guest";

  // Hooks early return se pehle hone chahiye
  const chat = useMeetingChat(roomId, displayName, chatOpen);

  if (!roomId) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white text-center">
        <h1 className="text-2xl font-bold text-navy-900">Meeting nahi mili</h1>
        <p className="text-navy-700">Meeting ID ya link invalid hai.</p>
        <Link to="/" className="rounded-lg bg-brand-500 px-4 py-2 text-white hover:bg-brand-600">
          Home par jayein
        </Link>
      </div>
    );
  }

  const inviteLink = buildInviteLink(roomId);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setCopyFailed(false);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyFailed(true);
    }
  };

  return (
    <div className="flex h-screen flex-col bg-navy-900 text-white">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <Video className="h-5 w-5 text-brand-500" aria-hidden="true" />
          <span className="font-semibold">MEETPRO AI</span>
          <span className="ml-2 rounded bg-white/10 px-2 py-0.5 text-sm">{roomId}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setChatOpen((open) => !open)}
            aria-label={chatOpen ? "Close chat" : "Open chat"}
            className="relative flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 text-sm hover:bg-white/20"
          >
            <MessageSquare className="h-4 w-4" aria-hidden="true" />
            Chat
            {chat.unreadCount > 0 && !chatOpen && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-500 px-1 text-xs font-semibold">
                {chat.unreadCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={copyLink}
            className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 text-sm hover:bg-white/20"
          >
            {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
            {copied ? "Link copied" : "Copy invite link"}
          </button>
        </div>
      </header>

      {copyFailed && (
        <p className="bg-red-900/40 px-4 py-2 text-sm text-red-200">
          Link copy nahi ho saka. Browser address bar se link copy karein: {inviteLink}
        </p>
      )}

      <main className="relative flex min-h-0 flex-1">
        <div className="min-w-0 flex-1">
          <JitsiMeeting
            key={roomId}
            roomId={roomId}
            displayName={displayName}
            onLeave={() => navigate("/", { replace: true })}
            className="h-full"
          />
        </div>

        {chatOpen && (
          <div className="absolute inset-0 z-20 flex flex-col md:static md:z-auto md:w-96 md:shrink-0 md:border-l md:border-white/10">
            <ChatPanel
              timeline={chat.timeline}
              participants={chat.participants}
              selfId={chat.selfId}
              typingNames={chat.typingNames}
              connectionState={chat.connectionState}
              notice={chat.notice}
              onDismissNotice={chat.dismissNotice}
              onSend={chat.sendMessage}
              onTyping={chat.sendTyping}
              onReaction={chat.sendReaction}
              onClose={() => setChatOpen(false)}
            />
          </div>
        )}
      </main>

      {config.isPublicJitsi && (
        <footer className="bg-navy-800 px-4 py-1 text-center text-xs text-white/60">
          Testing mode: public Jitsi server (meet.jit.si) use ho raha hai.
        </footer>
      )}
    </div>
  );
}
