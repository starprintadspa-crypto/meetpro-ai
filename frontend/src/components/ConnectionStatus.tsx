import type { ConnectionState } from "../types/chat";

const STATUS_LABEL: Record<ConnectionState, string> = {
  connecting: "Connecting...",
  connected: "Connected",
  reconnecting: "Reconnecting...",
  disconnected: "Disconnected",
  error: "Connection error",
};

const STATUS_DOT: Record<ConnectionState, string> = {
  connecting: "bg-amber-400",
  connected: "bg-emerald-500",
  reconnecting: "bg-amber-400 animate-pulse",
  disconnected: "bg-navy-700/40",
  error: "bg-red-500",
};

interface ConnectionStatusProps {
  state: ConnectionState;
}

export default function ConnectionStatus({ state }: ConnectionStatusProps) {
  return (
    <div role="status" aria-live="polite" className="flex items-center gap-2 text-xs text-navy-700">
      <span className={`h-2 w-2 rounded-full ${STATUS_DOT[state]}`} aria-hidden="true" />
      <span>{STATUS_LABEL[state]}</span>
    </div>
  );
}
