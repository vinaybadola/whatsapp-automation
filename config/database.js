import { connect, set } from 'mongoose';
import { log } from '../utils/logger.js';
import { dbUri } from './envConfig.js';

let cachedDb = null;

const connectDB = async () => {
  try {
    if (cachedDb) return cachedDb;

    await connect(dbUri, { 
      serverSelectionTimeoutMS: 20000, 
      maxPoolSize: 10, // Allows up to 10 sockets to be opened simultaneously
    });
    cachedDb = true
    console.log('MongoDB Connected');
  } catch (err) {
    set('debug', true);
    console.error(`MongoDB connection error: ${err}`);
    log.error("An error occurred while connecting to the database", err);
    process.exit(1); 
  }
};

export default connectDB;
