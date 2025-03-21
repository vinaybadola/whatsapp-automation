import express from 'express';
const router = express.Router();

import AttendanceService from '../services/attendance-service.js';
const attendanceService = new AttendanceService();

router.get("/essl-attendance", attendanceService.getAttendanceData);
router.get("/fetch-raw-punches", attendanceService.getRawPunches);

router.get("/employee-activity/:employeeCode", attendanceService.getEmployeeActivity);
export default router;