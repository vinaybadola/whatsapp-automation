import messageQueue from './queue.js';
import Message from '../src/messages/models/message-data-model.js';
import { connectServices } from '../src/devices/services/connectServices.js';
import messageTrackerModel from '../src/messageTracker/models/message-tracker-model.js';
export async function processMessages() {
  
  messageQueue.on('completed', (job) => console.log(`Job ${job.id} completed`));


  messageQueue.on('failed', async (job, error) => {
    console.error(`Job ${job.id} failed -from-here:`, error.message);

    if (error.message.toLowerCase().includes('connection closed')) {
      console.log(`Job ${job.id} failed due to connection closed. Delegating to retryQueue...`);     
    }
  });

  messageQueue.process('sendMessage', 1, async (job) => {
    if (!job.data) {
      return 'Missing job data';
    }
   
    const { sessionId, phoneNumber, messageContent, messageId, userId, mode, sentVia, devicePhone,source } = job.data;
    console.log(`Processing job ${job.id} - Data:`, job.data);
    try {
      if (sessionId === 'dummy-id') {
        console.log('Forcing connection closed error for dummy session');
        throw new Error('Connection closed');
      }

      const client = await connectServices.getClient(sessionId, null, userId, mode);
      await new Promise(resolve => setTimeout(resolve, 3000));
      if (!client) {
        throw new Error('Client not found !');
      }

      if (sentVia !== 'individual' && sentVia !== 'group') {
        throw new Error(`Invalid sentVia value: ${sentVia}`);
      }

      let recipientId;
      if (sentVia === 'individual') {
        recipientId = `${phoneNumber}@s.whatsapp.net`; // For individual messages
      } else {
        recipientId = phoneNumber; // For group messages (phoneNumber should already be in <number>@g.us format)
      }

      await client.sendMessage(recipientId, { text: messageContent });

      await new Promise(resolve => setTimeout(resolve, 4000));
      
      const messageTracker = await messageTrackerModel.create({
          sessionId ,
          jobId: job.id,
          senderId: devicePhone,
          receiverId: phoneNumber,
          status: 'sent',
          userId,
          message: messageContent,
          mode,
          sentVia,
          lead_source:source,
          requeued: false,
          retryCount: 0,
          processed: true,
        });
        
        await Message.findByIdAndUpdate(messageId,
        { status: 'sent' , reasonForFailure: null , messageTrackerId : messageTracker._id});

    } catch (error) {
      console.error('Job failed:', error.message);
      const isConnectionClosed = error.message.toLowerCase().includes('connection closed');
        const messageTracker = await messageTrackerModel.create({
          jobId: job.id,
          senderId: devicePhone,
          receiverId: phoneNumber,
          status: 'failed',
          error: error.message,
          requeued: isConnectionClosed,
          userId,
          message: messageContent,
          mode,
          sentVia,
          lead_source: source,
        });
        await Message.findByIdAndUpdate(messageId, { status: 'failed', reasonForFailure: error.message, messageTrackerId : messageTracker._id })
      throw error;
    }
  });
}