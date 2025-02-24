import retryQueue from './retry-queue.js';
import messageQueue from '../../config/queue.js';

async function isMessageQueueIdle(queue) {
  const activeJobs = await queue.getActive();
  return activeJobs.length === 0;
}

retryQueue.process('retryMessage', 5, async (job) => {
  console.log(`Retrying job from retryQueue, job id: ${job.id}`);
  
  try {
    // Check if messageQueue is idle
    const idle = await isMessageQueueIdle(messageQueue);
    
    if (idle) {
      await messageQueue.add('sendMessage', job.data);
      console.log(`Job requeued in messageQueue successfully.`);
    } else {
      // If there are active jobs, re-add the job to the retryQueue with a delay (e.g., 1 minute)
      console.log(`MessageQueue is busy. Delaying requeue of job ${job.id}`);
      await retryQueue.add('retryMessage', job.data, { delay: 60000 });
    }
  } catch (error) {
    console.error(`Failed to process retry job ${job.id}:`, error.message);
    throw error;
  }
});
