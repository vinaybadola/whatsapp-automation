import express from 'express';
const router = express.Router();

import UserAttendanceController from '../controllers/user-attendance-controller.js';
const userAttendanceController = new UserAttendanceController();

import RawAttendanceController from '../controllers/raw-attendance-controller.js';
const rawAttendanceController = new RawAttendanceController();

router.get('/employee', userAttendanceController.getUserAttendanceData);
router.get('/', userAttendanceController.getAllUserAttendanceData);
router.put('/update-attendance/:empCode', userAttendanceController.updateUserAttendanceData);
router.post('/add-attendance', userAttendanceController.addUserAttendanceData);
router.get("/all-employee-shift", userAttendanceController.getAllEmployeeShiftData);
router.get("/get-present-absent-employee", userAttendanceController.getAllUserAbsentPresentData);

router.get("/dashboard", userAttendanceController.getDashboardData);
router.get("/id/:id", userAttendanceController.getUserAttendanceById);
router.get("/history/:employeeCode", userAttendanceController.getUserAttendanceHistory);

// Raw attendance routes
router.get('/raw-attendance', rawAttendanceController.getAllRawAttendanceData);
router.put('/update-raw-attendance/:empCode', rawAttendanceController.updateRawAttendanceData);

export default router;