import express from 'express';
const router = express.Router();

import AttendanceService from '../services/attendance-service.js';
const attendanceService = new AttendanceService();

router.post('/attendance-processing', attendanceService.processAttendanceData);

export default router;