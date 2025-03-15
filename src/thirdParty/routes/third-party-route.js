import express from 'express';
const router = express.Router();

import ThirdPartyController from '../controllers/thirdPartyController.js';
const thirdPartyController = new ThirdPartyController();

router.post("/process-interested-user", thirdPartyController.processInterstedUser);

export default router;
