import messageQueue from './queue.js';
import Message from '../src/messages/models/message-data-model.js';
import {connectServices} from '../src/devices/services/connectServices.js';

export async function processMessages() {
  messageQueue.on('completed', (job) => {
    console.log(`Job ${job.id} completed`);
  });

  messageQueue.on('failed', (job, error) => {
    console.error(`Job ${job.id} failed:`, error.message);
  });

  messageQueue.process('sendMessage', 5, async (job) => {
    if (!job.data) {
      return 'Missing job data';
    }
    const { sessionId, phoneNumber, messageContent, messageId, userId, mode } = job.data;
    console.log('Processing job with data:', job.data);

    try {
      const client = await connectServices.getClient(sessionId, null, userId, mode);
      if (!client) {
        throw new Error('Session not found');
      }

      const formattedNumber = `${phoneNumber}@s.whatsapp.net`;
      await client.sendMessage(formattedNumber, { text: messageContent });
      console.log('Message sent successfully');

      await Message.findByIdAndUpdate(messageId, { status: 'sent' });
    } catch (error) {
      console.error('Job failed:', error.message);
      await Message.findByIdAndUpdate(messageId, { status: 'failed', reasonForFailure: error.message });
      throw error;
    }
  });
}