import express from 'express';
const router = express.Router();

import UserController from '../controllers/user-controller.js';
import customAuth from "../../../middlewares/auth-middleware.js";
import { handleValidationErrors } from "../../../helpers/data-validation.js";
import upload from "../../../config/multerConfig.js";
import {userRoleChangeValidation, validateId, roleValidation} from "../validators/user-validation.js";

const userController = new UserController();

router.get('/profile/', customAuth, handleValidationErrors, userController.getUserById);
router.put('/profile-update/', customAuth, upload.single('profileImage'), handleValidationErrors,userController.updateUser);
router.post('/change-user-role', userRoleChangeValidation,handleValidationErrors, userController.changeUserRole);

// Roles related 
router.post("/create-role", roleValidation, handleValidationErrors, userController.createRole);
router.get("/get-roles", userController.getAllRoles);
router.get("/get-role/:id", validateId, handleValidationErrors, userController.getRoleById);
router.put("/update-role/:id", validateId, roleValidation,handleValidationErrors,userController.updateRole);

export default router;
