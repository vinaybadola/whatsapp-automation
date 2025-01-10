// src/services/whatsapp-service.js
import { launch } from 'puppeteer';
import qrcode from 'qrcode';
import Session from '../../devices/models/session-model.js';

let browser;
let page;

const initializeWhatsApp = async (io) => {
  browser = await launch({ headless: false });
  page = await browser.newPage();
  await page.goto('https://web.whatsapp.com');

  // Emit "Session started" event
  io.emit('sessionUpdate', { status: 'Session started' });

  return page;
};

const getQRCode = async (sessionId, io) => {
  try {
    await page.waitForSelector('canvas');
    const qrCodeData = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      return canvas.toDataURL();
    });

    await Session.create({ sessionId, qrCode: qrCodeData });

    io.emit('sessionUpdate', { status: 'QR code generated', qrCode: qrCodeData });

    return qrCodeData;
  } catch (error) {
    io.emit('sessionUpdate', { status: 'QR code expired' });
    throw new Error('Failed to generate QR code');
  }
};

const checkConnectionStatus = async (sessionId, io) => {
  try {
    await page.waitForNavigation();
    const isConnected = await page.evaluate(() => {
      return !!document.querySelector('div[data-testid="chat-list"]');
    });

    // Update session status in the database
    await Session.findOneAndUpdate({ sessionId }, { isConnected });

    // Emit "User connected" event
    io.emit('sessionUpdate', { status: 'User connected' });

    return isConnected;
  } catch (error) {
    throw new Error('Failed to check connection status');
  }
};

export default {
  initializeWhatsApp,
  getQRCode,
  checkConnectionStatus,
};