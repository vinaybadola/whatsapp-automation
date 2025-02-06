import express from 'express';
const router = express.Router();

import ExternalController from '../controllers/external-controller.js';
const externalController = new ExternalController();

import {userQueryValidation} from '../validators/external-data-validator.js';
import { handleValidationErrors } from "../../../helpers/data-validation.js";
 
// THIS IS THE ROUTE FOR THE EXTERNAL WHATSAPP USED IN gtel.in , wibro.in to get the user data in whatsapp group
router.post("/send-group-message", userQueryValidation, handleValidationErrors, externalController.sendGroupMessage);
router.post("/send-individual-message", externalController.sendIndividualMessage);

export default router;