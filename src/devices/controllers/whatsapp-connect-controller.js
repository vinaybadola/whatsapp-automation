import {connectServices} from '../services/connectServices.js';
import sessionModel from '../models/session-model.js';
import {formatPhoneNumber} from '../../../helpers/message-helper.js';
import DeviceListModel from '../models/device-list-model.js';
export default class WhatsAppConnect {

  startSession = async (req, res) => {
    const { sessionId,devicePhone } = req.body;
    const io = req.app.get('socketio');

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }
    const userId = req.user?.id || req.user?._id || "678619aa40269dc5850b5063";     
    if (!devicePhone) {
      return res.status(400).json({ error: 'Device Phone Number is required' });
    }

    // check if phone with same session id is already connected 
    const sessionExists = await sessionModel.findOne({socketessionId : sessionId, is_connected : true, });
    if(sessionExists){
      return res.status(400).json({ error: 'Session already exists for this user' });
    }

    // check if phone number is already connected
    const phoneExists = await DeviceListModel.findOne({devicePhone, status : 'online'});
    if(phoneExists){
      return res.status(400).json({ error: 'Phone number is already connected' });
    }
    
    try {
      let mode = "qr";
      await connectServices.createWhatsAppClient(sessionId, io,userId, devicePhone, mode);
      return res.status(200).json({ success: '👍 true', message: 'Session started successfully' });
    } catch (error) {
      console.error(`An error occurred while starting WhatsApp session: ${error.message}`);
      if(error instanceof Error){
        return res.status(400).json({ success: '👎 false', error: error.message });
      }
      return res.status(500).json({ success: '👎 false', error: error.message });
    }
  };

  sendMessage = async (req, res) => {
    try {
    const { sessionId, phoneNumber, message , devicePhone } = req.body;
    const messageContent = message;
    const io = req.app.get('socketio');

    if (!sessionId || !phoneNumber || !message || !devicePhone) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const formattedPhoneNumber = formatPhoneNumber(phoneNumber);
    const userId = req.user?.id || req.user?._id || "678619aa40269dc5850b5063";
    const mode = "message-processing";
    await connectServices.sendIndividualMessage(sessionId, io, userId, formattedPhoneNumber, messageContent, mode, devicePhone);
    return res.status(200).json({success: true, message: 'Message is queued for sending' });
    }catch (error) {
      console.error('An error occurred while sending message in the controller :', error);
      if(error instanceof Error){
        return res.status(400).json({ success: false, error: error.message });
      }
      res.status(500).json({ success: false,error: error.message });
    }
  };

  sendMessageOnGroup = async(req,res)=>{
    try{
      const {groupId, message,sessionId} = req.body;
      if(!groupId || !message || !sessionId){
        return res.status(400).json({success: false, error: 'Missing required fields'});
      }
      const userId = req.user?.id || req.user?._id;
      const mode = "message-processing";
      const io = req.app.get('socketio');
      const response = await connectServices.sendMessageGroup(sessionId,io,groupId,message,userId,mode,devicePhone);
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
      const userId = req.user?.id || req.user?._id || "678619aa40269dc5850b5063";
      const io = req.app.get('socketio');
      const groups = await connectServices.fetchGroups(sessionId, userId, io);
      io.to(sessionId).emit('groups-data', groups);

      return res.status(200).json({ success: true, groups });
    } catch (err) {
      console.log('An error occurred while fetching groups:', err);
      if(err instanceof Error){
        return res.status(400).json({ success: false, error: err.message });
      }
      return res.status(500).json({ success: false, error: `An error occurred while fetching groups: ${err.message}` });
    }
  };

  fetchGroupParticipants = async (req, res) => {
    try{
      const { sessionId, groupId } = req.body;
      const userId = req.user?.id || req.user?._id || "678619aa40269dc5850b5063";
      if (!sessionId || !groupId) {
        return res.status(400).json({ success: false, error: 'Session ID and Group ID are required' });
      }
      const io = req.app.get('socketio');
      const participants = await connectServices.fetchParticipants(sessionId, groupId, userId, io);
      io.to(sessionId).emit('participants-data', participants);
      return res.status(200).json({ success: true, participants });
    }
    catch(err){
      console.log(`An error occurred while fetching participants: ${err.message}`);
      if(err instanceof Error){
        return res.status(400).json({ success: false, error: err.message });
      }
      return res.status(500).json({ success: false, error: `An error occurred while fetching participants: ${err.message}` });
    }
  }

  logout = async (req, res) => {
    try {
      const { sessionId, devicePhone } = req.body;

      if (!sessionId) {
        return res.status(400).json({ success: false, error: 'Session ID is required' });
      }
      if (!devicePhone) {
        return res.status(400).json({ success: false, error: 'Device Phone Number is required' });
      }

      const userMail = req.user?.email;
      const userId = req.user?.id || req.user?._id;
      const name = req.user?.name;
  
      const io = req.app.get('socketio');

      const logout = await connectServices.logout(sessionId, io, devicePhone, userMail, userId, name);
      if(!logout){
        return res.status(400).json({ success: false, error: 'Failed to logout or client already logged out' });
      }

      io.to(sessionId).emit('logout-success');

      return res.status(200).json({ success: true, message: 'Logged out successfully' });

    } catch (err) {
      console.log('An error occurred while logging out:', err);
      if(err instanceof Error){
        return res.status(400).json({ success: false, error: err.message });
      }
      return res.status(500).json({ success: false, error: `An error occurred while logging out: ${err.message}` });
    }
  };
}