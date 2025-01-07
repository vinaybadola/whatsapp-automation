import express from 'express';
const router = express.Router();

import AuthController from '../controllers/auth-controller.js';
import { handleValidationErrors } from "../../../helpers/data-validation.js";
import customAuth from "../../../middlewares/auth-middleware.js";
import upload from "../../../config/multerConfig.js";

import { validateNewUserData, validateLoginData} from "../validators/auth-validation.js";
const authController = new AuthController();

router.post('/register', upload.single('profileImage'), validateNewUserData, handleValidationErrors, authController.register);
router.post('/login', validateLoginData, handleValidationErrors,  authController.login);
router.get('/logout', customAuth, authController.logout);

export default router;
