import express from 'express';
const router = express.Router();

import ExternalController from '../controllers/external-controller.js';
const externalController = new ExternalController();

router.post("/send-group-message", externalController.sendGroupMessage);
router.post("/send-individual-message", externalController.sendIndividualMessage);

export default router;