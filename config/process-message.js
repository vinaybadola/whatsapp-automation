import messageQueue from './queue.js';
import Message from '../src/messages/models/message-data-model.js';
import { connectServices } from '../src/devices/services/connectServices.js';
import messageTrackerModel from '../src/messageTracker/models/message-tracker-model.js';
import retryQueue from '../jobs/job-data/retry-queue.js';

export async function processMessages() {
  
  messageQueue.on('completed', (job) => {
    console.log(`Job ${job.id} completed`);
  });

  messageQueue.on('failed', async (job, error) => {
    console.error(`Job ${job.id} failed:`, error.message);

    if (error.message.toLowerCase().includes('Connection closed')) {
      console.log(`Job ${job.id} failed due to connection closed. Delegating to retryQueue...`);
  
      // Add the job to the retry queue with a delay (for example, 5 minutes = 300000 ms)
      await retryQueue.add('retryMessage', job.data, {
        delay: 300000,
      });
    }

  });

  messageQueue.process('sendMessage', 5, async (job) => {
    if (!job.data) {
      return 'Missing job data';
    }
    const { sessionId, phoneNumber, messageContent, messageId, userId, mode, sentVia, devicePhone,source } = job.data;
    try {
      if(sessionId === 'dummy-id'){
        throw new Error('Connection closed');
      }
      const client = await connectServices.getClient(sessionId, null, userId, mode);
      await new Promise(resolve => setTimeout(resolve, 3000));
      if (!client) {
        throw new Error('Connection closed');
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
      await Promise.all([
        Message.findByIdAndUpdate(messageId, { status: 'sent' }),
        messageTrackerModel.create({
          jobId: job.id,
          senderId: devicePhone,
          receiverId: phoneNumber,
          status: 'sent',
          userId,
          message: messageContent,
          mode,
          sentVia,
          lead_source:source,
        }),
      ]);
    } catch (error) {
      console.error('Job failed:', error.message);
      await Promise.all([
        Message.findByIdAndUpdate(messageId, { status: 'failed', reasonForFailure: error.message }),
        messageTrackerModel.create({
          jobId: job.id,
          senderId: devicePhone,
          receiverId: phoneNumber,
          status: 'failed',
          error: error.message,
          userId,
          message: messageContent,
          mode,
          sentVia,
          lead_source:source,
        }),
      ]);
      throw error;
    }
  });
}