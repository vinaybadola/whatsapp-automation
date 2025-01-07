import express from 'express';
const router = express.Router();

import UserController from '../controllers/user-controller.js';
import customAuth from "../../../middlewares/auth-middleware.js";
import { handleValidationErrors } from "../../../helpers/data-validation.js";
import upload from "../../../config/multerConfig.js";

import {validateId} from "../validators/auth-validation.js";
const userController = new UserController();

router.get('/profile/:id', customAuth, validateId, handleValidationErrors, userController.getUserById);
router.put('/profile-update/:id', customAuth, upload.single('profileImage'), validateId, handleValidationErrors,userController.updateUser);

export default router;
