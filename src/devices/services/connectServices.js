import { makeWASocket, DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';
import Session from "../models/session-model.js";

export default class ConnectServices {
  constructor() {
    this.clients = new Map();
  }

  async createWhatsAppClient(sessionId, io) {
    // Load session from database if it exists
    const session = await Session.findOne({ sessionId });

    // Use multi-file auth state for better session management
    const { state, saveCreds } = await useMultiFileAuthState(`./sessions/${sessionId}`);

    // Create the WhatsApp client
    const client = makeWASocket({
      auth: state,
      printQRInTerminal: false,
    });

    // Save credentials when updated
    client.ev.on('creds.update', async () => {
      await saveCreds();
      await Session.updateOne(
        { sessionId },
        { $set: { authState: state } },
        { upsert: true }
      );
    });

    // Handle connection updates
    client.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        console.log('qrcode', qr);
        qrcode.generate(qr, { small: true }, (qrcode) => {
          console.log('Emitting QR Code:', qrcode);
          io.to(sessionId).emit('qr-code', qrcode);
        });
      }

      if (connection === 'close') {
        const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
        if (shouldReconnect) {
          console.log('Reconnecting in 5 seconds...');
          setTimeout(() => {
            this.createWhatsAppClient(sessionId, io); // Reconnect with delay
          }, 5000); // 5-second delay
        } else {
          this.clients.delete(sessionId); // Remove client if logged out
          console.log('Client logged out. Session removed.');
        }
      } else if (connection === 'open') {
        io.to(sessionId).emit('connected', 'Device connected successfully!');
      }
    });

    // Handle incoming messages (optional)
    client.ev.on('messages.upsert', ({ messages }) => {
      console.log('New message:', messages);
    });

    this.clients.set(sessionId, client);
    return client;
  }

  getClient(sessionId) {
    return this.clients.get(sessionId); // Get a client by sessionId
  }

  deleteClient(sessionId) {
    this.clients.delete(sessionId);
  }
}