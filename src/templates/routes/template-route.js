import express from "express";
const router = express.Router();

import TemplateController from "../controllers/template-controller.js";
const templateController = new TemplateController();
import templateValidation from "../validation/template-validation.js";
import { handleValidationErrors } from "../../../helpers/data-validation.js";

router.post("/create", templateValidation.createTemplate, handleValidationErrors, templateController.createTemplate);
router.get("/", templateController.getAllTemplate);
router.get("/show/:id", templateValidation.getTemplate, handleValidationErrors, templateController.getTemplate);
router.put("/update/:id", templateValidation.createTemplate, handleValidationErrors, templateController.updateTemplate);
router.delete("/delete/:id", templateValidation.deleteTemplate, handleValidationErrors, templateController.deleteTemplate);

export default router;
