import  Queue  from 'bull';

const messageQueue = new Queue('messageQueue', {
  redis: {
    host: '127.0.0.1', 
    port: 6379,        
  },
  limiter: {
    max: 2,            
    duration: 30000,
  },
});

messageQueue.on('error', (err) => console.error('Queue error:', err));

messageQueue.on('stalled', (job) => console.warn('Stalled job:', job.id));

messageQueue.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed: ${err.message}`);
});

messageQueue.on('completed', (job, result) => {
  console.log(`Job ${job.id} completed successfully`);
});

export default messageQueue;