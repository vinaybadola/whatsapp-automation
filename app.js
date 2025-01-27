import express from 'express';
import http from 'http'; 
import { Server } from 'socket.io'; 
import connectDB from './config/database.js';
import securityMiddleware from './middlewares/security-middleware.js';
import { processMessages } from './config/process-message.js';
import path from 'path';

// Import routes
import authRoutes from './src/users/routes/auth-route.js';
import userRoutes from './src/users/routes/user-route.js';
import deviceListRoutes from './src/devices/routes/device-list-route.js';
import deviceConnectRoutes from './src/devices/routes/device-connect-route.js';
import thirdPartyRoutes from "./src/thirdParty/routes/third-party-route.js";
import templateRoutes from "./src/templates/routes/template-route.js";
import contactsRoutes from './src/messages/routes/contacts-route.js';

const app = express();
const server = http.createServer(app); 
const io = new Server(server);

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

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/device', deviceListRoutes);
app.use('/api/device/connect', deviceConnectRoutes);
app.use("/api/third-party",thirdPartyRoutes);
app.use("/api/template", templateRoutes);
app.use("/api/contacts", contactsRoutes);

export { app, server, io };