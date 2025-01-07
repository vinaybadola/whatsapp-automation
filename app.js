import express from 'express';
const app = express();
import connectDB from './config/database.js';
import securityMiddleware from './middlewares/security-middleware.js';
import path from 'path';
import authRoutes from './src/users/routes/auth-route.js';
import userRoutes from './src/users/routes/user-route.js';
connectDB();

securityMiddleware(app);

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);

export default app;