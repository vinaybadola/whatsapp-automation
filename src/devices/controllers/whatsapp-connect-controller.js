import {connectServices} from '../services/connectServices.js';
import { log } from '../../../utils/logger.js';
import sessionModel from '../models/session-model.js';
import {formatPhoneNumber} from '../../../helpers/message-helper.js';
import mongoose from 'mongoose';
export default class WhatsAppConnect {
  constructor() {
  }

  startSession = async (req, res) => {
    const { sessionId, } = req.body;
    const io = req.app.get('socketio');

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    try {
      // const userId = req.user.id || req.user._id;
      const userId = "678619aa40269dc5850b5063";
      const devicePhone = "919695215220";
      let mode = "qr";
      await connectServices.createWhatsAppClient(sessionId, io,userId, devicePhone, mode);
      return res.status(200).json({ success: '👍 true', message: 'Session started successfully' });
    } catch (error) {
      log.error(`An error occurred while starting WhatsApp session: ${error.message}`);
      return res.status(500).json({ success: '👎 false', error: error.message });
    }
  };

  sendMessage = async (req, res) => {
    try {
    const { sessionId, phoneNumber, message } = req.body;
    const io = req.app.get('socketio');

    if (!sessionId || !phoneNumber || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // sanitize the phone number
    const formattedPhoneNumber = formatPhoneNumber(phoneNumber);

    // fetch the user-id from session model
    const getUser = await sessionModel.findOne({socketessionId : sessionId});

    let userId = getUser ? getUser.user_id : "678619aa40269dc5850b5063";
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      userId = "678619aa40269dc5850b5063"; 
    }  
    const mode = "message-processing";
    await connectServices.sendIndividualMessage(sessionId, io, userId, formattedPhoneNumber, message, mode);
      res.status(200).json({ message: 'Message is queued for sending' });
    }catch (error) {
      console.error('An error occurred while sending message in the controller :', error);
      res.status(500).json({ success: false,error: error.message });
    }
  };

  sendMessageOnGroup = async(req,res)=>{
    try{
      const {groupId, message,sessionId} = req.body;
      if(!groupId || !message || !sessionId){
        return res.status(400).json({success: false, error: 'Missing required fields'});
      }
      const userId = req.user.id || req.user._id || "678619aa40269dc5850b5063"; //TODO: add the middleware and remove this hardcoded text
      const mode = "message-processing";
      const response = await connectServices.sendMessageGroup(sessionId,groupId,message,userId,mode);
      return res.status(200).json({ success: true, message: response.message });
    }
    catch(err){
      console.log('An error occurred while sending message to group:', err);
      if(err instanceof Error){
        return res.status(400).json({success: false, error: err.message});
      }
      return res.status(500).json({success: false, error: `An error occurred while sending message to group : ${err.message}`});
    }
  } 

  fetchGroups = async (req, res) => {
    try {
      const { sessionId } = req.body;
      if (!sessionId) {
        return res.status(400).json({ success: false, error: 'Session ID is required' });
      }
  
      const groups = await connectServices.fetchGroups(sessionId);
      const io = req.app.get('socketio');
      io.to(sessionId).emit('groups-data', groups);
  
      return res.status(200).json({ success: true, groups });
    } catch (err) {
      console.log('An error occurred while fetching groups:', err);
      return res.status(500).json({ success: false, error: `An error occurred while fetching groups: ${err.message}` });
    }
  };

  // logout = async (req, res) => {
  //   try {
  //     const { sessionId } = req.body;

  //     if (!sessionId) {
  //       return res.status(400).json({ success: false, error: 'Session ID is required' });
  //     }
  
  //     const io = req.app.get('socketio');
  //     await connectServices.logout(sessionId);
  //     io.to(sessionId).emit('logout-success');
  //     return res.status(200).json({ success: true, message: 'Logged out successfully' });
  //   } catch (err) {
  //     console.log('An error occurred while logging out:', err);
  //     if(err instanceof Error){
  //       return res.status(400).json({ success: false, error: err.message });
  //     }
  //     return res.status(500).json({ success: false, error: `An error occurred while logging out: ${err.message}` });
  //   }
  // };
}