import {port, enviornment} from "./config/envConfig.js"
import app from "./app.js"; 
const PORT = port || 5000;
import {log} from './utils/logger.js';

app.get('/', (req, res) => {
  res.send('Namaste World!');
});

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    log.error(`Error: ${err.message}`);
    return res.status(400).json({ message: 'File upload error', error: err.message });
  }
  else if(err){
    log.error(`Error: ${err.message}`);
    res.status(500).json({ message: 'Internal Server Error', error: err.message });
  }
  next();
});


app.all('*', (req, res) => res.status(404).json({ message: 'No Matching Route' }));

app.listen(PORT, (err) => {
  if(enviornment === 'DEVELOPMENT' ){
    log.info(`Server started on port ${PORT}`);
  }
  if (err) {
    log.error(`Error starting server: ${err.message}`);
    process.exit(1);
  }
});