import { connect, set } from 'mongoose';
import { log } from '../utils/logger.js';
import { dbUri } from './envConfig.js';

const connectDB = async () => {
  try {
    await connect(process.env.MONGO_URI, {   
    });
    console.log('MongoDB Connected');
  } catch (err) {
    set('debug', true);
    console.error(`MongoDB connection error: ${err}`);
    log.error("An error occurred while connecting to the database", err);
    process.exit(1); 
  }
};

export default connectDB;
