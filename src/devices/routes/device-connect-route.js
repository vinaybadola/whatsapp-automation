import customAuth from '../../../middlewares/auth-middleware.js'; //TODO: add middleware to these routes
import WhatsAppConnectController from '../controllers/whatsapp-connect-controller.js';

const connectController = new WhatsAppConnectController();

import express from 'express';
const router = express.Router();

router.post("/startSession", connectController.startSession);
router.post("/send-message", connectController.sendMessage);
router.post("/send-message-group", connectController.sendMessageOnGroup);
router.post("/fetch-groups", connectController.fetchGroups);

export default router;
