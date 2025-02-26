import mongoose from 'mongoose';
import { externalMongoUri } from './envConfig.js';

let connections = {}; // Store multiple database instances

async function connectExternalMongo(dbName = 'shiftRoaster') {
  if (!connections[dbName]) {
    try {
      // Create a base connection (only once)
      if (!connections._baseConnection) {
        connections._baseConnection = mongoose.createConnection(externalMongoUri, {
          serverSelectionTimeoutMS: 5000,
        });

        // Wait for connection to open
        await new Promise((resolve, reject) => {
          connections._baseConnection.once('open', resolve);
          connections._baseConnection.once('error', reject);
        });

        console.log('✅ Connected to external MongoDB');
      }

      // Use the specified database and store it
      connections[dbName] = connections._baseConnection.useDb(dbName);
      console.log(`✅ Using database: ${dbName}`);

    } catch (error) {
      console.error('❌ Error connecting to external MongoDB:', error);
      process.exit(1);
    }
  }
  return connections[dbName]; // Return the selected database instance
}

// **Connect to required databases**
const shiftRoasterDB = await connectExternalMongo('shiftRoaster'); // For attendance
// const userDB = await connectExternalMongo('userDb'); // For users

export { connectExternalMongo, shiftRoasterDB };
