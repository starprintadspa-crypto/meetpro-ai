import { Router } from "express";
import {
  createMeetingHandler,
  getMeetingByRoomId,
  listMyMeetings,
} from "../controllers/meetingController";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.post("/", requireAuth, createMeetingHandler);
router.get("/mine", requireAuth, listMyMeetings);
router.get("/:roomId", getMeetingByRoomId);

export default router;
