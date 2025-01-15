import express from 'express';
const router = express.Router();

import { handleValidationErrors } from "../../../helpers/data-validation.js";
import {sendMessageValidator} from "../validators/thirdPartyValidators.js";

import ThirdPartyController from '../controllers/thirdPartyController.js';
const thirdPartyController = new ThirdPartyController();

router.post("/groupMessage/send", sendMessageValidator, handleValidationErrors, thirdPartyController.sendMessage);

export default router;
