import sql from 'mssql';
import {dbUser, dbPassword, dbServer, databaseName} from './envConfig.js';

let connectionPool;

const dbConfig = {
    user: dbUser,
    password: dbPassword,
    server: dbServer,
    database: databaseName,
    options: { encrypt: false, trustServerCertificate: true },
};

const connectMSSQL = async () => {
  try {
    if (!connectionPool) {
      connectionPool = await sql.connect(dbConfig);
      console.log('Connected to MSSQL database');
    }
    return connectionPool;
  } catch (error) {
    console.error('Error connecting to MSSQL database:', error);
    throw error;
  }
};

export { sql, connectMSSQL };