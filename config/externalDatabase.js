import mongoose from 'mongoose';
import {externalMongoUri} from "./envConfig.js";

export default connectExternalMongo = async () => {
  try {
    const connection = await mongoose.createConnection(externalMongoUri, {
    });
    console.log('Connected to external MongoDB');
    return connection.useDb('shiftRoaster'); 
  } catch (error) {
    console.error('Error connecting to external MongoDB:', error);
    process.exit(1);
  }
};

