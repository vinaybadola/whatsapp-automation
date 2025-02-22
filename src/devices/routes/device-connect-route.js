import {sendMessageGroupValidation, sendMessageValidation, startSessionValidation} from '../validators/external-data-validator.js';
import { handleValidationErrors } from "../../../helpers/data-validation.js";

import customAuth from '../../../middlewares/auth-middleware.js'; 
import WhatsAppConnectController from '../controllers/whatsapp-connect-controller.js';

const connectController = new WhatsAppConnectController();

import express from 'express';
const router = express.Router();

router.post("/startSession",customAuth,startSessionValidation, handleValidationErrors,connectController.startSession);
router.post("/send-message",customAuth,sendMessageValidation,handleValidationErrors, connectController.sendMessage);
router.post("/send-message-group",customAuth,sendMessageGroupValidation,handleValidationErrors, connectController.sendMessageOnGroup);
router.post("/fetch-groups",customAuth,connectController.fetchGroups);
router.post("/fetch-group-participants",customAuth, connectController.fetchGroupParticipants);
router.post("/logout",customAuth,connectController.logout);

export default router;
