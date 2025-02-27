import express from 'express';
const router = express.Router();

import UserAttendanceController from '../controllers/user-attendance-controller.js';
const userAttendanceController = new UserAttendanceController();

router.get('/user-attendance/:empCode', userAttendanceController.getUserAttendanceData);
router.get('/all-user-attendance', userAttendanceController.getAllUserAttendanceData);
router.put('/update-attendance/:empCode', userAttendanceController.updateUserAttendanceData);
router.post('/add-attendance', userAttendanceController.addUserAttendanceData);

export default router;