import Queue from 'bull';

const retryQueue = new Queue('retryQueue', {
  redis: {
    host: '127.0.0.1',
    port: 6379,
  },
});

retryQueue.on('error', (err) => console.error('Retry Queue error:', err));
retryQueue.on('stalled', (job) => console.warn('Stalled retry job:', job.id));

export default retryQueue;
