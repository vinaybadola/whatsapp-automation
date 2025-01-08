import express from 'express';
const router = express.Router();

import UserController from '../controllers/user-controller.js';
import customAuth from "../../../middlewares/auth-middleware.js";
import { handleValidationErrors } from "../../../helpers/data-validation.js";
import upload from "../../../config/multerConfig.js";

const userController = new UserController();

router.get('/profile/', customAuth, handleValidationErrors, userController.getUserById);
router.put('/profile-update/', customAuth, upload.single('profileImage'), handleValidationErrors,userController.updateUser);

export default router;
