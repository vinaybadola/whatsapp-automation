import { makeWASocket, DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';
import Session from "../models/session-model.js";
import DeviceListModel from '../models/device-list-model.js';
import Message from '../../messages/models/message-data-model.js';
import messageQueue from '../../../config/queue.js';
import fs from 'fs';
import Email from '../../thirdParty/services/email-service.js';
import User from '../../users/models/user-model.js';
class ConnectServices {
  constructor() {
    this.clients = new Map();
    this.promises = new Map();
    this.email = new Email();
  }

  async createWhatsAppClient(sessionId, io, userId, devicePhone = null, mode = 'qr') {
    if (this.promises.has(sessionId)) {
      // console.log(`Awaiting client creation for session ${sessionId}`);
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
              const sessionPath = `./sessions/${sessionId}`;
              await fs.promises.rm(sessionPath, { recursive: true, force: true });

              if (devicePhone !== null) {
                await DeviceListModel.updateOne(
                  { devicePhone },
                  { $set: { status: 'offline', reasonForDisconnect: DisconnectReason.loggedOut } }
                );

                if (lastDisconnect?.error?.output?.statusCode === DisconnectReason.loggedOut) {
                  await this.sendLogoutEmail(sessionId); // Send logout email only if manually logged out
                }

                await Session.deleteOne({ socketessionId: sessionId });
              }
              this.clients.delete(sessionId);
              io.to(sessionId).emit('logout-success');
              
            } catch (error) {
              console.error('Error handling logout or session during connection close :', error);
            }
          }
        } else if (connection === 'open') {
          try {
            const connectedPhoneNumber = client.user.id.split(':')[0];

            const device = await DeviceListModel.findOne({ devicePhone: connectedPhoneNumber });
            
            if(!device){
              io.to(sessionId).emit('error', `Phone number mismatch! Expected ${devicePhone}, but connected ${connectedPhoneNumber}. Session terminated.`);
              this.clients.delete(sessionId);
              await client.logout();
              return null;
            }

            if (mode === 'qr') {
              if (devicePhone !== null) {
                await DeviceListModel.updateOne(
                  { devicePhone },
                  { $set: { status: 'online', reasonForDisconnect : null } }
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

  async getClient(sessionId, io, userId, mode, retries = 5, initialDelay = 1000) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        if (mode === 'qr' && !io) {
          throw new Error('io is required in QR mode');
        }
  
        if (this.clients.has(sessionId)) {
          const client = this.clients.get(sessionId);
          console.log('Returning Client from cache for session:', sessionId);
          return client;
        }
         else {
          const clientFromDatabase = await Session.findOne({ socketessionId: sessionId , userId, is_connected: true });
          if(!clientFromDatabase) {
            console.error(`Session not found in the database for session ID: ${sessionId}`);
            return null;
          }
          console.log('Client not found. Creating a new one with session id:', sessionId);
          return await this.createWhatsAppClient(sessionId, io, userId, null, mode);
        }
      } catch (error) {
        console.error(`Attempt ${attempt} failed:`, error.message);
  
        if (attempt === retries) {
          throw new Error(`Failed to get client after ${retries} attempts: ${error.message}`);
        }
  
        const delay = initialDelay * Math.pow(2, attempt - 1); // Exponential backoff
        console.log(`Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  async deleteClient(sessionId) {
    this.clients.delete(sessionId);
  }

  async sendMessageGroup(sessionId, io, groupId, messageContent, userId, mode,devicePhone) {
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
        phoneNumber: groupId,
        messageContent,
        messageId: message._id,
        userId,
        mode,
        sentVia: 'group',
        devicePhone
      });

      return { success: true, message: `Message has been queued ${groupId}` };
    } catch (error) {
      console.error('Error sending message to group:', error);
      throw new Error(`Failed to send message to group: ${error.message}`);
    }
  }

  async sendIndividualMessage(sessionId, io, userId, formattedPhoneNumber, messageContent, mode,devicePhone) {
    try {

      const client = await this.getClient(sessionId, io, userId, mode);

      const [userOnWhatsApp] = await client.isOnWhatsApp(formattedPhoneNumber);

      if (!userOnWhatsApp?.exists) {
       console.log(`The phone number ${formattedPhoneNumber} is not registered on WhatsApp while sending Message`);
       return null;
      }

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
        phoneNumber: formattedPhoneNumber,
        messageContent,
        messageId: message._id,
        mode,
        sentVia: 'individual',
        devicePhone
      });

      // return client;
    } catch (error) {
      console.error('Error sending individual message:', error);
      throw new Error(error.message);
    }
  }

  async fetchGroups(sessionId, userId, io) {
    try {
      let client = this.clients.get(sessionId);
      if (!client) {
        client = await this.getClient(sessionId, io, userId, 'qr');
        if (!client) {
          throw new Error('Client not found.');
        }
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

  async fetchParticipants(sessionId, groupId, userId, io, retries = 5, initialDelay = 1000) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            let client = this.clients.get(sessionId);
            if (!client) {
                console.log(`Client not found in memory. Initializing for session: ${sessionId}`);
                client = await this.getClient(sessionId, io, userId, 'qr');
                if (!client) {
                    throw new Error('Client not found.');
                }
            }

            // Fetch participants for a specific group
            const metadata = await client.groupMetadata(groupId);
            const participants = metadata.participants.map((participant) => ({
                id: participant.id,
                name: participant.name || participant.id,
                phoneNumber: participant.id.split('@')[0],
            }));

            return participants; 
        } catch (error) {
            console.error(`Attempt ${attempt} failed:`, error.message);

            if (attempt === retries) {
                // If this was the last attempt, throw the error
                throw new Error(`Failed to fetch participants after ${retries} attempts: ${error.message}`);
            }

            const delay = initialDelay * Math.pow(2, attempt - 1);
            console.log(`Retrying in ${delay}ms...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
        }
    }
  }

  async logout(sessionId, io) {
    const client = this.clients.get(sessionId);
    if (!client) {
      console.error('Client not found for session:', sessionId);
      return;
    }

    try {
      // Attempt to logout only if the connection is still open
      await client.logout();
    } catch (error) {
      console.error('Error during logout:', error);
    }

    // Send logout email
    await this.sendLogoutEmail(sessionId);

    // Clean up session data
    const sessionPath = `./sessions/${sessionId}`;
    await fs.promises.rm(sessionPath, { recursive: true, force: true });

    try {
      const sessionData = await Session.findOne({ socketessionId: sessionId });
      if (!sessionData) {
        console.error("Session not found:", sessionId);
        throw new Error("Session not found");
      }

      const sendMailDevice = await DeviceListModel.findOne({ sessionId: sessionData._id });
      if (!sendMailDevice) {
        console.error("Device not found for session:", sessionId);
        throw new Error("Device not found");
      }

      await DeviceListModel.updateOne(
        { devicePhone: sendMailDevice.devicePhone },
        { $set: { status: 'offline', reasonForDisconnect: DisconnectReason.loggedOut } },
      );

      await Session.deleteOne({ socketessionId: sessionId });

      io.to(sessionId).emit('logout-success');
    } catch (error) {
      console.error("Error occurred while cleaning up session:", error.message);
    }
    finally {
      this.clients.delete(sessionId);
    }
  }

  async invalidateSession(sessionId) {
    try {
      // Forcefully disconnect the client
      const client = this.clients.get(sessionId);
      if (client) {
        await client.end(); // Forcefully end the connection
      }

      // Clear any residual session data
      const sessionPath = `./sessions/${sessionId}`;
      if (fs.existsSync(sessionPath)) {
        await fs.promises.rm(sessionPath, { recursive: true, force: true });
      }

      console.log('Session invalidated successfully.');
    } catch (error) {
      console.error('Error invalidating session:', error);
      throw error;
    }
  }

  async sendLogoutEmail(sessionId) {
    try {
      const sessionData = await Session.findOne({ socketessionId: sessionId });
      if (!sessionData) {
        console.error("Session not found:", sessionId);
        throw new Error("Session not found");
      }

      const sendMailDevice = await DeviceListModel.findOne({ sessionId: sessionData._id });
      if (!sendMailDevice) {
        console.error("Device not found for session:", sessionId);
        throw new Error("Device not found");
      }

      const userData = await User.findOne({ _id: sessionData.user_id });
      if (!userData) {
        console.error("User not found for session:", sessionId);
        throw new Error("User not found");
      }

      const data = {
        userId: userData._id,
        phoneNumber: sendMailDevice.devicePhone,
        name: userData.name || "Example User",
        mail: userData.email || "botvinay416@gmail.com",
        templateType: "device-logout"
      };

      await this.email.sendNotificationMail(data);

      await Session.findOneAndDelete({ socketessionId: sessionId });

      console.log('Logout email sent successfully.');
    } catch (error) {
      console.error("Error sending logout email:", error.message);
    }
  }
}

export const connectServices = new ConnectServices();