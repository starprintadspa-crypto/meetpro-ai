// Online participants ka in-memory record (ek server instance ke liye)
export interface Participant {
  participantId: string;
  displayName: string;
  joinedAt: string;
}

class PresenceStore {
  private rooms = new Map<string, Map<string, Participant>>();

  add(roomId: string, participantId: string, displayName: string): Participant {
    const room = this.rooms.get(roomId) ?? new Map<string, Participant>();
    const participant: Participant = {
      participantId,
      displayName,
      joinedAt: new Date().toISOString(),
    };
    room.set(participantId, participant);
    this.rooms.set(roomId, room);
    return participant;
  }

  remove(roomId: string, participantId: string): Participant | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;
    const participant = room.get(participantId) ?? null;
    room.delete(participantId);
    if (room.size === 0) this.rooms.delete(roomId);
    return participant;
  }

  list(roomId: string): Participant[] {
    return Array.from(this.rooms.get(roomId)?.values() ?? []);
  }

  count(roomId: string): number {
    return this.rooms.get(roomId)?.size ?? 0;
  }
}

export const presence = new PresenceStore();
