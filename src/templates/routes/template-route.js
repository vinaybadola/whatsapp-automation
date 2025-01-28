import express from "express";
const router = express.Router();

import TemplateController from "../controllers/template-controller.js";
const templateController = new TemplateController();
import templateValidation from "../validation/template-validation.js";
import { handleValidationErrors } from "../../../helpers/data-validation.js";
import customAuth from "../../../middlewares/auth-middleware.js";

router.post("/create", customAuth, templateValidation.createTemplate, handleValidationErrors, templateController.createTemplate);
router.get("/",customAuth, templateController.getAllTemplate);
router.get("/show/:id", customAuth,templateValidation.getTemplate, handleValidationErrors, templateController.getTemplate);
router.put("/update/:id", customAuth,templateValidation.createTemplate, handleValidationErrors, templateController.updateTemplate);
router.delete("/delete/:id",customAuth, templateValidation.deleteTemplate, handleValidationErrors, templateController.deleteTemplate);

export default router;
