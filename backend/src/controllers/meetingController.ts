import type { NextFunction, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { env } from "../config/env";
import {
  createMeeting,
  findMeetingByRoomId,
  listMeetingsByHost,
  type MeetingDto,
} from "../services/meetingService";
import { getAuthUser } from "../middleware/auth";
import { asRecord, isValidRoomId, sanitizeTitle } from "../utils/validation";

const MAX_SCHEDULE_AHEAD_MS = 365 * 24 * 60 * 60 * 1000;

function withInviteUrl(meeting: MeetingDto) {
  return { ...meeting, inviteUrl: `${env.CLIENT_URL}/meeting/${meeting.roomId}` };
}

// Meeting ID: UUID v4 (unique). Frontend room validation isi format se match karta hai.
export async function createMeetingHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = getAuthUser(res);
    const body = asRecord(req.body);

    let scheduledAt: Date | null = null;
    if (body.scheduledAt !== undefined && body.scheduledAt !== null) {
      const parsed = typeof body.scheduledAt === "string" ? Date.parse(body.scheduledAt) : NaN;
      const now = Date.now();
      if (Number.isNaN(parsed) || parsed < now - 60_000 || parsed > now + MAX_SCHEDULE_AHEAD_MS) {
        res.status(400).json({ message: "scheduledAt valid future date-time hona chahiye (1 saal ke andar)." });
        return;
      }
      scheduledAt = new Date(parsed);
    }

    const meeting = await createMeeting({
      roomId: uuidv4(),
      hostId: user.id,
      title: sanitizeTitle(body.title),
      scheduledAt,
    });
    res.status(201).json({ meeting: withInviteUrl(meeting) });
  } catch (error) {
    next(error);
  }
}

export async function listMyMeetings(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = getAuthUser(res);
    const meetings = await listMeetingsByHost(user.id);
    res.json({ meetings: meetings.map(withInviteUrl) });
  } catch (error) {
    next(error);
  }
}

// Public: invitation link kholne par meeting info (host ID ya participants nahi)
export async function getMeetingByRoomId(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const roomId = req.params.roomId;
    if (!isValidRoomId(roomId)) {
      res.status(400).json({ message: "Meeting ID invalid hai." });
      return;
    }
    const meeting = await findMeetingByRoomId(roomId);
    if (!meeting) {
      res.status(404).json({ message: "Meeting nahi mili." });
      return;
    }
    res.json({
      meeting: {
        roomId: meeting.roomId,
        title: meeting.title,
        status: meeting.status,
        scheduledAt: meeting.scheduledAt,
        createdAt: meeting.createdAt,
        inviteUrl: `${env.CLIENT_URL}/meeting/${meeting.roomId}`,
      },
    });
  } catch (error) {
    next(error);
  }
}
