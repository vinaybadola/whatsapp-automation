import express from 'express';
const router = express.Router();

import DeviceListController from '../controllers/device-list-controller.js';
import customAuth from '../../../middlewares/auth-middleware.js';

const deviceListController = new DeviceListController();

router.post('/create', customAuth, deviceListController.createDevice);
router.get('/', customAuth, deviceListController.getDeviceList);
router.get('/show/:deviceId', customAuth, deviceListController.getDevice);
router.put('/update/:deviceId', customAuth, deviceListController.updateDevice);
router.delete('/delete/:deviceId', customAuth, deviceListController.deleteDevice);

export default router;