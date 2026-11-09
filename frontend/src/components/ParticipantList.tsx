import type { Participant } from "../types/chat";

interface ParticipantListProps {
  participants: Participant[];
  selfId: string | null;
}

export default function ParticipantList({ participants, selfId }: ParticipantListProps) {
  if (participants.length === 0) {
    return <p className="p-4 text-sm text-navy-700">Abhi koi online participant nahi.</p>;
  }

  return (
    <ul className="divide-y divide-navy-800/5">
      {participants.map((p) => {
        const isSelf = p.participantId === selfId;
        const initial = p.displayName.charAt(0).toUpperCase() || "G";
        return (
          <li key={p.participantId} className="flex items-center gap-3 px-4 py-3">
            <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700">
              {initial}
              <span
                className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500"
                title="Online"
                aria-label="Online"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-navy-900">
                {p.displayName}
                {isSelf && <span className="ml-1 text-xs text-navy-700/70">(You)</span>}
              </p>
              <p className="text-xs text-navy-700/70">Online</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
