import { port, environment } from './config/envConfig.js';
import { app, server } from './app.js'; // Import app and server from app.js
import { log } from './utils/logger.js';
import multer from 'multer';

const PORT = port || 5000;

// Root route
app.get('/', (req, res) => {
  res.send('Namaste World!');
});

// Error handling middleware
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    log.error(`Error: ${err.message}`);
    return res.status(400).json({ message: 'File upload error', error: err.message });
  } else if (err) {
    log.error(`Error: ${err.message}`);
    res.status(500).json({ message: 'Internal Server Error', error: err.message });
  }
  next();
});

app.all('*', (req, res) => {
  return res.status(404).json({ message: 'No Matching Route' });
});

// Handle uncaught exceptions and rejections
process.on('uncaughtException', (err) => {
  log.error(`Uncaught Exception: ${err.message}`);
  server.close(() => {
    process.exit(1);
  });
});

process.on('unhandledRejection', (err) => {
  log.error(`Unhandled Rejection: ${err.message}`);
  server.close(() => {
    process.exit(1);
  });
});

server.listen(PORT, (err) => {
  // if (environment === 'DEVELOPMENT') {
    log.info(`Server started on port ${PORT}`);
  //}
  if (err) {
    log.error(`Error starting server: ${err.message}`);
    process.exit(1);
  }
});