import express from 'express';
const router = express.Router();

import AttendanceService from '../services/attendance-service.js';
const attendanceService = new AttendanceService();

// router.post('/attendance-processing', attendanceService.processAttendanceData);
router.get("/essl-attendance", attendanceService.getAttendanceData);

export default router;