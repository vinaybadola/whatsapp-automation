import ConnectServices from '../services/connectServices.js';
import { log } from '../../../utils/logger.js';

export default class WhatsAppConnect {
  constructor() {
    this.connectServices = new ConnectServices();
  }

  startSession = async (req, res) => {
    const { sessionId } = req.body;
    const io = req.app.get('socketio');

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    try {
      await this.connectServices.createWhatsAppClient(sessionId, io);
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
    console.log('session-id', sessionId);
    const client = this.connectServices.getClient(sessionId);
    console.log('client>>', client);
    if (!client) {
      return res.status(404).json({ error: 'Session not found' });
    }

    try {
      const formattedNumber = `${phoneNumber}@s.whatsapp.net`;
      await client.sendMessage(formattedNumber, { text: message });
      res.status(200).json({ message: 'Message sent successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };
}