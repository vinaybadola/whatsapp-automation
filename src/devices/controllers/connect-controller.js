// import puppeteer from 'puppeteer';
// import qrcode from 'qrcode-terminal';


// const generateQRCode = async (io, socketId) => {
//   const browser = await puppeteer.launch({ 
//     headless: true,
//     executablePath: '/usr/bin/google-chrome',
//     args: ['--disable-gpu', '--no-sandbox', '--disable-setuid-sandbox']
//   });
//   const page = await browser.newPage();

//   try {
//     await page.goto('https://web.whatsapp.com/', { waitUntil: 'networkidle2' });

//     io.to(socketId).emit('update', { message: 'Session started...' });

//     // Wait for QR code to appear
//     const qrCodeSelector = 'canvas';
//     await page.waitForSelector(qrCodeSelector, { timeout: 10000 }); 

//     const qrCodeData = await page.evaluate((selector) => {
//       const canvas = document.querySelector(selector);
//       return canvas.toDataURL();
//     }, qrCodeSelector);

//     io.to(socketId).emit('update', { message: 'QR code generated', qrCode: qrCodeData });

//     // Wait for user to connect (check for profile picture or "Connected" status)
//     await page.waitForSelector('div[data-testid="default-user"]', { timeout: 60000 }); // Reduced timeout
//     io.to(socketId).emit('update', { message: 'User connected successfully!' });

//     await browser.close();
//   } catch (error) {
//     io.to(socketId).emit('update', { message: `Error: ${error.message}` });
//     await browser.close();
//   }
// };

// export const startWhatsAppSession = (req, res) => {
//   const socketId = req.query.socketId; 
//   const io = req.app.get('socketio');

//   if (!socketId) {
//     return res.status(400).json({ message: 'Socket ID is required' });
//   }

//   generateQRCode(io, socketId);

//   res.status(200).json({ message: 'QR code generation initiated' });
// };