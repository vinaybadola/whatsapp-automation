import messageQueue from '../config/queue.js';

const testJobData = {
    sessionId: 'dummy-id',
    phoneNumber: '1234567890',
    messageContent: 'Test message',
    messageId: 'dummyMessageId',
    userId: 'dummyUserId',
    mode: 'test',
    sentVia: 'individual',
    devicePhone: 'dummyDevice',
    source: 'testSource',
};

async function addTestJobToQueue() {
    try {
        await messageQueue.add('sendMessage', testJobData, {
            attempts: 1,
        });
        console.log('Job added successfully');
    } catch (error) {
        console.error('Failed to add job to queue:', error);
    }
}

addTestJobToQueue();
