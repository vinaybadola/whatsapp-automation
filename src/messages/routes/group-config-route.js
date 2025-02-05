import express from "express";
const router = express.Router();

import GroupConfigurationController from "../controllers/group-config-controller.js";
const groupConfigurationController = new GroupConfigurationController();

import {createValidator, idValidator} from "../validators/group-configuration-validation.js"
import { handleValidationErrors } from "../../../helpers/data-validation.js";

router.post("/create", createValidator, handleValidationErrors, groupConfigurationController.create);
router.get("/get/:id", idValidator, handleValidationErrors, groupConfigurationController.get);
router.get("/getAll", groupConfigurationController.getAll);
router.put("/update/:id", idValidator,  createValidator, handleValidationErrors,groupConfigurationController.update);
router.delete("/delete/:id",  idValidator, handleValidationErrors, groupConfigurationController.delete);

export default router;