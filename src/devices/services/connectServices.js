import { makeWASocket, DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';
import Session from "../models/session-model.js";
import DeviceListModel from '../models/device-list-model.js';
import Message from '../../messages/models/message-data-model.js';
import messageQueue from '../../../config/queue.js';
import fs from 'fs';
class ConnectServices {
  constructor() {
    this.clients = new Map();
    this.promises = new Map();
  }

  async createWhatsAppClient(sessionId, io, userId, devicePhone = null, mode = 'qr') {
    if (this.promises.has(sessionId)) {
      console.log(`Awaiting client creation for session ${sessionId}`);
      return await this.promises.get(sessionId);
    }

    const clientPromise = (async () => {
      try {
        const client = await this._internalCreateWhatsAppClient(sessionId, io, userId, devicePhone, mode);
        this.promises.delete(sessionId);
        return client;
      } catch (error) {
        this.promises.delete(sessionId);
        throw error;
      }
    })();

    this.promises.set(sessionId, clientPromise);
    return await clientPromise;
  }

  async _internalCreateWhatsAppClient(sessionId, io, userId, devicePhone = null, mode) {
    try {
      let { state, saveCreds } = await useMultiFileAuthState(`./sessions/${sessionId}`);
      const client = makeWASocket({
        auth: state,
        printQRInTerminal: false,
      });

      client.ev.on('creds.update', async () => {
        try {
          await saveCreds();
          if (devicePhone !== null) {
            const updatedSession = await Session.findOneAndUpdate(
              { socketessionId: sessionId },
              { $set: { authState: state, user_id: userId, is_connected: true } },
              { upsert: true, new: true }
            );

            await DeviceListModel.updateOne(
              { devicePhone },
              { $set: { sessionId: updatedSession._id } }
            );
          }

        } catch (error) {
          console.error('Error updating session credentials:', error);
        }
      });

      client.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr && mode === 'qr') {
          try {
            qrcode.generate(qr, { small: true }, (qrcode) => {
              io.to(sessionId).emit('qr-code', qrcode);
            });
          } catch (error) {
            console.error('Error emitting QR code:', error);
          }
        }

        if (connection === 'close') {
          const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
          if (shouldReconnect) {
            setTimeout(() => {
              this.createWhatsAppClient(sessionId, io, userId, devicePhone, mode);
            }, 5000);
          } else {
            try {
              this.clients.delete(sessionId);
              const sessionPath = `./sessions/${sessionId}`;
              await fs.promises.rm(sessionPath, { recursive: true, force: true });

              await Session.deleteOne({ socketessionId: sessionId });
              io.to(sessionId).emit('logout-success');

              mode = 'qr';
              this.createWhatsAppClient(sessionId, io, userId, null, mode);

              if (devicePhone !== null) {
                await DeviceListModel.updateOne(
                  { devicePhone },
                  { $set: { status: 'offline', reasonForDisconnect: DisconnectReason.loggedOut } }
                );
              }
            } catch (error) {
              console.error('Error handling logout or session during connection close :', error);
            }
          }
        } else if (connection === 'open') {
          try {
            if(mode === 'qr'){
              if (devicePhone !== null) {
                await DeviceListModel.updateOne(
                  { devicePhone },
                  { $set: { status: 'online' } }
                );
                io.to(sessionId).emit('connected', 'Device connected successfully!');
              }
            }
          } catch (error) {
            console.error('Error updating device status to online:', error);
          }
        }
      });

      if (mode === 'message-processing') {
        client.ev.on('messages.upsert', ({ messages }) => {
          try {
            console.log('Processing messages:', messages);
          } catch (error) {
            console.error('Error handling incoming messages in connect service class :', error);
          }
        });
      }

      this.clients.set(sessionId, client);
      console.log('Client added to map for session:', sessionId);
      return client;
    } catch (error) {
      console.error('Error creating WhatsApp client:', error);
      throw new Error(`Failed to create WhatsApp client : ${error.message}`);
    }
  }

  async getClient(sessionId, io, userId, mode) {
    try {
      if (mode === 'qr' && !io) {
        throw new Error('io is required in QR mode');
      }

      if (this.clients.has(sessionId)) {
        const client = this.clients.get(sessionId);
        console.log('Returning Client from cache for session:', sessionId);
        return client;
      } else {
        console.log('Client not found  creating a new one with session id:', sessionId);
        return await this.createWhatsAppClient(sessionId, io, userId, null, mode);
      }
    } catch (error) {
      console.error('Error getting client:', error);
      throw new Error(`Failed to get client: ${error.message}`);
    }
  }

  async deleteClient(sessionId) {
    this.clients.delete(sessionId);
  }

  async sendMessageGroup(sessionId, io, groupId, messageContent, userId, mode) {
    try {
      if (!groupId) throw new Error('Group JID is required.');
      if (!messageContent) throw new Error('Message content is required.');

      const message = new Message({
        sessionId,
        groupId,
        message: messageContent,
        sentVia: 'group',
        senderId: userId,
        status: 'pending',
      });
      await message.save();

      await messageQueue.add('sendMessage', {
        sessionId,
        groupId,
        messageContent,
        messageId: message._id,
        userId,
        mode,
      });

      return { success: true, message: `Message has been queued ${groupId}` };
    } catch (error) {
      console.error('Error sending message to group:', error);
      throw new Error(`Failed to send message to group: ${error.message}`);
    }
  }

  async sendIndividualMessage(sessionId, io, userId, formattedPhoneNumber, message, mode) {
    try {

      const message = new Message({
        sessionId,
        senderId: userId,
        phoneNumber: formattedPhoneNumber,
        status: 'pending',
        sentVia: 'individual',
        message: messageContent,
      });
      await message.save();

      await messageQueue.add('sendMessage', {
        sessionId,
        phoneNumber : formattedPhoneNumber,
        messageContent,
        messageId: message._id,
        mode
      });

      // return client;
    } catch (error) {
      console.error('Error sending individual message:', error);
      throw new Error(error.message);
    }
  }

  async fetchGroups(sessionId) {
    try {
      const client = this.clients.get(sessionId);
      if (!client) {
        throw new Error('Session not found.');
      }
  
      const groups = await client.groupFetchAllParticipating();
      return Object.values(groups).map((group) => ({
        id: group.id,
        name: group.subject,
      }));
    } catch (error) {
      console.error('Error fetching groups:', error);
      throw new Error(`Failed to fetch groups: ${error.message}`);
    }
  }

}

export const connectServices = new ConnectServices();