import { port, environment } from './config/envConfig.js';
import { app, server } from './app.js'; // Import app and server from app.js
import multer from 'multer';

const PORT = port || 9000;

// Root route
app.get('/', (req, res) => {
  return res.send('Namaste World!');
});

// Error handling middleware
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    console.error(`Error: ${err.message}`);
    return res.status(400).json({ message: 'File upload error', error: err.message });
  } else if (err) {
    console.error(`Error: ${err.message}`);
    return res.status(500).json({ message: 'Internal Server Error', error: err.message });
  }
  next();
});

app.all('*', (req, res) => {
  return res.status(404).json({ message: 'No Matching Route' });
});

// Handle uncaught exceptions and rejections
process.on('uncaughtException', (err) => {
  console.error(`Uncaught Exception: ${err.message}`);
  server.close(() => {
    process.exit(1);
  });
});

process.on('unhandledRejection', (err) => {
  console.error(`Unhandled Rejection: ${err.message}`);
  server.close(() => {
    process.exit(1);
  });
});

const startServer = (port) => {
  server.listen(port, (err) => {
    if (err) {
      if (err.code === 'EADDRINUSE') {
        console.info(`Port ${port} is already in use. Trying port ${port + 1}...`);
        startServer(port + 1); // Try the next port
      } else {
        console.error(`Error starting server: ${err.message}`);
        process.exit(1);
      }
    } else {
      console.info(`Server started on port ${port}`);
    }
  });
};

startServer(PORT);

process.on('SIGINT', () => {
  console.info('SIGINT received. Shutting down gracefully...');
  server.close(() => {
    console.info('Server closed.');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.info('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.info('Server closed.');
    process.exit(0);
  });
});