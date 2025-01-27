import GroupDataController from "../controllers/group-data-controller.js";
import customAuth from "../../../middlewares/auth-middleware.js";

const groupDataController = new GroupDataController();

import express from "express";
const router = express.Router();

router.post("/create-group", customAuth, groupDataController.createGroup);
router.post("/save-groups", customAuth, groupDataController.saveAllGroups);
router.get("/get-all-groups", customAuth, groupDataController.fetchGroups);
router.post("/get-group-by/:id", customAuth, groupDataController.getGroupById);
router.post("/update-group/:id", customAuth, groupDataController.updateGroup);
router.post("/delete-group", customAuth, groupDataController.deleteGroup);

export default router;