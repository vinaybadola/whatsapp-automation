import customAuth from '../../../middlewares/auth-middleware.js'; 
import WhatsAppConnectController from '../controllers/whatsapp-connect-controller.js';

const connectController = new WhatsAppConnectController();

import express from 'express';
const router = express.Router();

router.post("/startSession",customAuth,connectController.startSession);
router.post("/send-message",customAuth,connectController.sendMessage);
router.post("/send-message-group",customAuth,connectController.sendMessageOnGroup);
router.post("/fetch-groups",customAuth,connectController.fetchGroups);
router.post("/fetch-group-participants",customAuth, connectController.fetchGroupParticipants);
router.post("/logout",customAuth,connectController.logout);

export default router;
