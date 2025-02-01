import express from 'express';
const router = express.Router();

import AllowedWindowController from '../controllers/allowed-window-controller.js';
const allowedWindowController = new AllowedWindowController();

router.post('/create', allowedWindowController.createAllowedWindow);
router.get('/get', allowedWindowController.getAllowedWindows);
router.get('/get/:id', allowedWindowController.getAllowedWindowById);
router.put('/update', allowedWindowController.updateAllowedWindow);
router.patch('/status/:id', allowedWindowController.updateWindowStatus);

export default router;
