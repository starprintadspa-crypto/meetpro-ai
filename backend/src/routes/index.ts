import { Router } from "express";
import authRoutes from "./authRoutes";
import meetingRoutes from "./meetingRoutes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/meetings", meetingRoutes);

export default router;
