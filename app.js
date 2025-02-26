import express from 'express';
import http from 'http'; 
import { Server } from 'socket.io'; 
import connectDB from './config/database.js';
import securityMiddleware from './middlewares/security-middleware.js';
import { processMessages } from './config/process-message.js';
import "./jobs/job-data/run-failed-jobs.js"
import runJobs from './jobs/index.js';
import {allowedOrigins,allowedMethods,allowedCredentials,allowedHeaders,allowedExposedHeaders} from "./config/envConfig.js";
import path from 'path';

// Import routes
import authRoutes from './src/users/routes/auth-route.js';
import userRoutes from './src/users/routes/user-route.js';
import deviceListRoutes from './src/devices/routes/device-list-route.js';
import deviceConnectRoutes from './src/devices/routes/device-connect-route.js';
import thirdPartyRoutes from "./src/thirdParty/routes/third-party-route.js";
import templateRoutes from "./src/templates/routes/template-route.js";
import contactsRoutes from './src/messages/routes/contacts-route.js';
import messageTrackRoutes from './src/messageTracker/routes/message-track-route.js';
import externalAPiRoutes from './src/devices/routes/external-whatsapp-route.js';
import groupConfigRoutes from './src/messages/routes/group-config-route.js';
import attendanceProcessingRoutes from "./src/attendance/routes/attendance-processing-route.js";

const app = express();
const server = http.createServer(app); 
const io = new Server(server, {
  cors: {
    origin: allowedOrigins, 
    methods: allowedMethods, 
    credentials: allowedCredentials,
    allowedHeaders: allowedHeaders,
    exposedHeaders: allowedExposedHeaders
  },
});

await connectDB();

securityMiddleware(app);

// Attach Socket.IO to the app
app.set('socketio', io);

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
  
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  
    socket.on('error', (err) => {
      console.error('Socket error:', err);
    });
  });

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
app.use(express.static(path.join(process.cwd(), 'public')));

processMessages();
runJobs();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/device', deviceListRoutes);
app.use('/api/device/connect', deviceConnectRoutes);
app.use("/api/third-party",thirdPartyRoutes);
app.use("/api/template", templateRoutes);
app.use("/api/contacts", contactsRoutes);
app.use("/api/message-tracker", messageTrackRoutes);
app.use("/api/external", externalAPiRoutes);
app.use("/api/group-configuration", groupConfigRoutes);
app.use("/api/attendance", attendanceProcessingRoutes);

export { app, server, io };