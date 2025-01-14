import { makeWASocket, DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';
import Session from "../models/session-model.js";
import DeviceListModel from '../models/device-list-model.js';

export default class ConnectServices {
  constructor() {
    this.clients = new Map();
  }

  async createWhatsAppClient(sessionId, io, userId, devicePhone) {
    try {
      // Load session from database if it exists
      const session = await Session.findOne({ socketessionId: sessionId });

      // Use multi-file auth state for better session management
      let { state, saveCreds } = await useMultiFileAuthState(`./sessions/${sessionId}`);

      // Create the WhatsApp client
      const client = makeWASocket({
        auth: state,
        printQRInTerminal: false,
      });

      // Save credentials when updated
      client.ev.on('creds.update', async () => {
        try {
          await saveCreds();
          const updatedSession = await Session.findOneAndUpdate(
            { socketessionId: sessionId },
            { $set: { authState: state, user_id: userId, is_connected: true } },
            { upsert: true, new: true } // `new: true` returns the updated document
          );

          // Link the session ID to the device in `device-list`
          await DeviceListModel.updateOne(
            { devicePhone },
            { $set: { sessionId: updatedSession._id } }
          );
        } catch (error) {
          console.error('Error updating session credentials:', error);
        }
      });

      // Handle connection updates
      client.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          try {
            console.log('qrcode', qr);
            qrcode.generate(qr, { small: true }, (qrcode) => {
              console.log('Emitting QR Code:', qrcode);
              io.to(sessionId).emit('qr-code', qrcode);
            });
          } catch (error) {
            console.error('Error emitting QR code:', error);
          }
        }

        if (connection === 'close') {
          const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;

          if (shouldReconnect) {
            console.log('Reconnecting in 5 seconds...');
            setTimeout(() => {
              this.createWhatsAppClient(sessionId, io, userId, devicePhone); // Reconnect with delay
            }, 5000); // 5-second delay
          } else {
            try {
              this.clients.delete(sessionId); // Remove client if logged out
              console.log('Client logged out. Session removed.');

              // Set device status to offline
              await DeviceListModel.updateOne(
                { devicePhone },
                { $set: { status: 'offline', 
                  reasonForDisconnect: DisconnectReason.loggedOut 
                } }
              );

              // Remove session from database
              await Session.deleteOne({ socketessionId: sessionId });
            } catch (error) {
              console.error('Error handling logout or session removal:', error);
            }
          }
        } else if (connection === 'open') {
          try {
            console.log('Device connected successfully!');

            // Update device status to online
            await DeviceListModel.updateOne(
              { devicePhone },
              { $set: { status: 'online' } }
            );

            io.to(sessionId).emit('connected', 'Device connected successfully!');
          } catch (error) {
            console.error('Error updating device status to online:', error);
          }
        }
      });

      // Handle incoming messages (optional)
      client.ev.on('messages.upsert', ({ messages }) => {
        try {
          console.log('New message:', messages);
        } catch (error) {
          console.error('Error handling incoming messages:', error);
        }
      });

      this.clients.set(sessionId, client);
      return client;
    } catch (error) {
      console.error('Error creating WhatsApp client:', error);
      throw new Error('Failed to create WhatsApp client.'); // Propagate error if needed
    }
  }

  getClient(sessionId) {
    return this.clients.get(sessionId); 
  }

  deleteClient(sessionId) {
    this.clients.delete(sessionId);
  }
}
