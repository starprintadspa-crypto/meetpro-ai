import { prisma } from "../database/prisma";

export interface ChatMessageDto {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  message: string;
  createdAt: string;
}

export interface MeetingDto {
  id: string;
  roomId: string;
  title: string;
  hostId: string | null;
  status: string;
  scheduledAt: string | null;
  createdAt: string;
}

function toMeetingDto(row: {
  id: string;
  roomId: string;
  title: string;
  hostId: string | null;
  status: string;
  scheduledAt: Date | null;
  createdAt: Date;
}): MeetingDto {
  return {
    id: row.id,
    roomId: row.roomId,
    title: row.title,
    hostId: row.hostId,
    status: row.status,
    scheduledAt: row.scheduledAt ? row.scheduledAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
}

// Socket join ke liye: meeting row na ho to banata hai
export async function ensureMeeting(roomId: string): Promise<void> {
  await prisma.meeting.upsert({
    where: { roomId },
    update: {},
    create: { roomId },
  });
}

export async function createMeeting(input: {
  roomId: string;
  hostId: string;
  title: string;
  scheduledAt: Date | null;
}): Promise<MeetingDto> {
  const row = await prisma.meeting.create({ data: input });
  return toMeetingDto(row);
}

export async function findMeetingByRoomId(roomId: string): Promise<MeetingDto | null> {
  const row = await prisma.meeting.findUnique({ where: { roomId } });
  return row ? toMeetingDto(row) : null;
}

export async function listMeetingsByHost(hostId: string, limit = 50): Promise<MeetingDto[]> {
  const rows = await prisma.meeting.findMany({
    where: { hostId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.map(toMeetingDto);
}

export async function saveMessage(input: {
  roomId: string;
  senderId: string;
  senderName: string;
  message: string;
}): Promise<ChatMessageDto> {
  const row = await prisma.meetingMessage.create({
    data: {
      meeting: { connect: { roomId: input.roomId } },
      senderId: input.senderId,
      senderName: input.senderName,
      message: input.message,
    },
  });
  return {
    id: row.id,
    roomId: input.roomId,
    senderId: row.senderId,
    senderName: row.senderName,
    message: row.message,
    createdAt: row.createdAt.toISOString(),
  };
}

// Latest N messages, purane se naye order mein
export async function getRecentMessages(roomId: string, limit: number): Promise<ChatMessageDto[]> {
  const rows = await prisma.meetingMessage.findMany({
    where: { meeting: { roomId } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows
    .reverse()
    .map((row) => ({
      id: row.id,
      roomId,
      senderId: row.senderId,
      senderName: row.senderName,
      message: row.message,
      createdAt: row.createdAt.toISOString(),
    }));
}

// Participant history: join record. Error par null (chat chalta rehta hai).
export async function recordParticipantJoin(input: {
  roomId: string;
  userId: string | null;
  displayName: string;
}): Promise<string | null> {
  try {
    const meeting = await prisma.meeting.findUnique({ where: { roomId: input.roomId } });
    if (!meeting) return null;
    const row = await prisma.meetingParticipant.create({
      data: { meetingId: meeting.id, userId: input.userId, displayName: input.displayName },
    });
    return row.id;
  } catch (error) {
    console.error("recordParticipantJoin failed:", error);
    return null;
  }
}

export async function recordParticipantLeave(participantRowId: string): Promise<void> {
  try {
    await prisma.meetingParticipant.update({
      where: { id: participantRowId },
      data: { leftAt: new Date() },
    });
  } catch (error) {
    console.error("recordParticipantLeave failed:", error);
  }
}
