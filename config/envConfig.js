import { config } from 'dotenv';
import fs from 'fs';
const envFile = process.env.NODE_ENV === 'PRODUCTION' ? '.env.production' : '.env';

if (fs.existsSync(envFile)) {
    config({ path: envFile });
    console.log(`✅ Loaded environment variables from ${envFile}`);
} else {
    console.warn(`⚠️ Warning: ${envFile} file not found!`);
}

export const dbUri = process.env.MONGO_URI;
export const port = process.env.PORT || 5000;
export const jwtSecret = process.env.JWT_SECRET;
export const dbName = process.env.DB_NAME;
export const secretKey = process.env.SECRET_KEY;
export const refreshTokenExpirationTime = 7 * 24 * 60 * 60 * 1000;
export const frontendUri = process.env.FRONTEND_URL || "http://localhost:3000";
export const environment = process.env.NODE_ENV;
export const localEnvironment = process.env.LOCAL_ENVIRONMENT || false;

// Configurations for third party whatsmate API 
export const wmateClientId = process.env.WMATE_CLIENT_ID;
export const wmateClientSecret = process.env.WMATE_CLIENT_SECRET;
export const instanceId = process.env.INSTANCE_ID;
export const groupAdminNumber = process.env.GROUP_ADMIN_NUMBER;
export const groupName = process.env.GROUP_NAME;

// Configurations for sending emails
export const adminMail = process.env.ADMIN_MAIL || "220suraj@gmail.com";
export const adminPassword = process.env.ADMIN_PASSWORD || "jeclvxvofkknghbz";
export const smtpHost = process.env.SMTP_HOST;
export const smtpPort = process.env.SMTP_PORT;
export const smptFrom = process.env.SMTP_FROM;

// configurations for attendance service
export const externalMongoUri = process.env.EXTERNAL_MONGO_URI;
export const dbUser = process.env.DB_USER;
export const dbPassword = process.env.DB_PASSWORD;
export const dbServer = process.env.DB_SERVER;
export const databaseName = process.env.DATABASE_NAME;

export const allowedOrigins = [frontendUri, 'https://hradmin.gtel.in', 'http://localhost:3000', "https://www.gtel.in/", " /\.gtel\.in$/", "http://localhost:8003", "http://127.0.0.1:5500"];
export const allowedMethods = ["GET", "POST", "PUT", "DELETE", "PATCH"];
export const allowedCredentials = true;
export const allowedHeaders = ["Authorization", "Content-Type", "X-Requested-With", "Accept", "Origin"];
export const allowedExposedHeaders = ["Authorization"];

export const puppeterBrowserPath=process.env.PUPPETER_BROWSER_PATH;