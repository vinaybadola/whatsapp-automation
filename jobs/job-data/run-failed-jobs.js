import cron from 'node-cron';
import messageQueue from '../../config/queue.js';
import Message from '../../src/messages/models/message-data-model.js';

cron.schedule('*/2 * * * *', async () => {
  console.log('Cron job running: fetching failed jobs for today');
  try {
    const failedJobs = await Message.find({
      status: 'failed',
      reasonForFailure: /connection closed/i,
      createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
    }).populate('messageTrackerId'); 
    
    if (failedJobs.length > 0) {
      console.log(`Found ${failedJobs.length} failed jobs. Requeuing...`);
      for (const job of failedJobs) {
        await messageQueue.add('sendMessage', {
          sessionId: job.sessionId,
          phoneNumber: job.messageTrackerId.receiverId,
          messageContent: job.message,
          messageId: job._id,
          userId: job.messageTrackerId.userId,
          mode: job.messageTrackerId.mode,
          sentVia: job.sentVia,
          devicePhone: job.messageTrackerId.senderId,
          source: job.messageTrackerId.lead_source,
        });
      }
    } else {
      console.log('No failed jobs to requeue at this time.');
    }
  } catch (error) {
    console.error('Error in cron job:', error.message);
  }
});
