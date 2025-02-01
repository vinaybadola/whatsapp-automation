import {connect, set } from 'mongoose';
import { dbUri } from './envConfig.js';

let cachedDb = null;

const connectDB = async () => {
  try {
    if (cachedDb) return cachedDb;
    await connect(dbUri, { 
      serverSelectionTimeoutMS: 20000, 
      maxPoolSize: 10 
    }) 
    cachedDb = true
    console.log('MongoDB Connected');
  } catch (err) {
    set('debug', true);
    console.error(`MongoDB connection error: ${err}`);
    process.exit(1); 
  }
};

export default connectDB;
