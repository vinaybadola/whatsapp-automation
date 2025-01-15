import ConnectServices from '../services/connectServices.js';
import { log } from '../../../utils/logger.js';
import sessionModel from '../models/session-model.js';
export default class WhatsAppConnect {
  constructor() {
    this.connectServices = new ConnectServices();
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
      await this.connectServices.createWhatsAppClient(sessionId, io,userId, devicePhone);
      return res.status(200).json({ success: '👍 true', message: 'Session started successfully' });
    } catch (error) {
      log.error(`An error occurred while starting WhatsApp session: ${error.message}`);
      return res.status(500).json({ success: '👎 false', error: error.message });
    }
  };

  sendMessage = async (req, res) => {
    const { sessionId, phoneNumber, message } = req.body;

    if (!sessionId || !phoneNumber || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    // console.log('session-id', sessionId);
    
    // fetch the user-id from session model
    const getUser = await sessionModel.findOne({socketessionId : sessionId});
    
    const client = this.connectServices.getClient(sessionId);
    // console.log('client>>', client);
    if (!client) {
      return res.status(404).json({ error: 'Session not found' });
    }

    try {
      const formattedNumber = `${this.formattingNumber(phoneNumber)}@s.whatsapp.net`;
      await client.sendMessage(formattedNumber, { text: message });
      res.status(200).json({ message: 'Message sent successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };

  formattingNumber = (phoneNumber) => {
    phoneNumber = phoneNumber.replace(/\D/g, '');

    // Check if the number starts with "+91" and remove the "+"
    if (phoneNumber.startsWith('91') && phoneNumber.length === 12) {
        return phoneNumber; // Already in correct format
    }

    // If the number is 10 digits, prepend "91"
    if (phoneNumber.length === 10) {
        return `91${phoneNumber}`;
    }

    // If the number is not valid, throw an error
    throw new Error('Invalid phone number format');

  }
}