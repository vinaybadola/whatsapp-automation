import express from 'express';
const router = express.Router();

import DeviceListController from '../controllers/device-list-controller.js';
const deviceListController = new DeviceListController();
import { handleValidationErrors } from "../../../helpers/data-validation.js";

import customAuth from '../../../middlewares/auth-middleware.js';
import {createDeviceValidation} from '../validators/device-list-validation.js';

router.post('/create',customAuth,createDeviceValidation,handleValidationErrors, deviceListController.createDevice);
router.get('/', customAuth, deviceListController.getDeviceList);
router.get('/show/:deviceId',customAuth, deviceListController.getDevice);
router.put('/update/:deviceId',customAuth,createDeviceValidation,handleValidationErrors, deviceListController.updateDevice);
router.delete('/delete/:deviceId',customAuth, deviceListController.deleteDevice);

export default router;