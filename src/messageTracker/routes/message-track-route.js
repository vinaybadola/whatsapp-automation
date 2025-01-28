import express from 'express';
const router = express.Router();

import MessageTrackerController from '../controllers/message-tracker-controller.js';
const messageTrackerController = new MessageTrackerController();
import customAuth from '../../../middlewares/auth-middleware.js';

router.get('/', customAuth, messageTrackerController.getData);
router.delete('/message-tracker/:id', customAuth, messageTrackerController.deleteData);
router.get('/message-tracker/:id',customAuth, messageTrackerController.getDataById);

export default router;
