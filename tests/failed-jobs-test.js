import messageQueue from '../config/queue.js';
import mongoose from 'mongoose';
import Message from '../src/messages/models/message-data-model.js';

const connectDB = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/whatsapp-automation', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

let messageDataId = null;

const createDataForMessage = async () => {
  const newMessage = new Message({
    sessionId: '2BXyh9p1xasGoctCAAGB',
    message: 'Test message',
    status: 'pending',
    senderId: new mongoose.Types.ObjectId("678619aa40269dc5850b5063"),
    sentVia: 'group',
    groupId: '120363389033674028@g.us',
    reasonForFailure: "Connection closed",
    createdAt: new Date(),
    updatedAt: new Date()
  });

  const savedMessage = await newMessage.save();
  messageDataId = savedMessage._id;
  console.log('messageDataId after save:', messageDataId);
};

const addTestJobToQueue = async (testJobData) => {
  try {
    await messageQueue.add('sendMessage', testJobData, {
      attempts: 1,
    });
    console.log('Job added successfully');
  } catch (error) {
    console.error('Failed to add job to queue:', error);
  }
};

const init = async () => {
  await connectDB();
  await createDataForMessage();

  // Now that messageDataId is available, define testJobData
  const testJobData = {
    sessionId: 'dummy-id',
    phoneNumber: '120363389033674028@g.us',
    messageContent: 'Test message',
    messageId: messageDataId,  // Using the _id from the saved Message document
    userId: new mongoose.Types.ObjectId("678619aa40269dc5850b5063"),
    mode: "message-processing",
    sentVia: 'group',
    devicePhone: '917457819144',
    source: 'testSource',
    requeued: true,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  await addTestJobToQueue(testJobData);
};

init().catch(console.error);