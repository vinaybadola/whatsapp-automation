import express from 'express';
const router = express.Router();

import AdminController from '../controllers/admin-controller.js';
const adminController = new AdminController();

import { handleValidationErrors } from "../../../helpers/data-validation.js";

router.get('/devices', adminController.getDevices);
router.post('/update-device', handleValidationErrors, adminController.updateDevice);
router.post('/delete-device', handleValidationErrors, adminController.deleteDevice);

router.get('/templates', adminController.getTemplates);
router.post('/update-template', handleValidationErrors, adminController.updateTemplate);

router.get('/users', adminController.getAllUsers);
router.post('/change-user-role', handleValidationErrors, adminController.changeUserRole);
router.post("/createRole", handleValidationErrors, adminController.createRole);
router.get('/roles', adminController.getAllRoles);
router.get('/role/:roleId', adminController.getRoleById);
router.post('/update-role', handleValidationErrors, adminController.updateRole);

router.get('/get-device-data', adminController.getMessagesForParticularDevice);

export default router;