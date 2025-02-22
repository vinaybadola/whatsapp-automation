import { body } from 'express-validator';

export const userQueryValidation = [
  body('data')
    .notEmpty()
    .withMessage('Data is required')
    .isObject()
    .withMessage('Data must be an array'),

  body('source')
    .notEmpty()
    .withMessage('Source is required')
    .isString()
    .withMessage('Source must be a string'),

  body('type')
    .notEmpty()
    .withMessage('Type is required')
    .isString()
    .withMessage('Type must be a string')
    .isIn([
      'sales-query',
      'website-inquiry',
      'gtel-website-inquiry',
      'wibro-website-query',
      'pm2-service-down',
      'customer-support-ticket',
    ])
    .withMessage('Invalid type'),
];

// sales-query = for third party whatsapp service (refrence sandeep shukla )
// gtel-website-inquiry = for website inquiry of gtel.in
// wibro-website-query = for website inquiry of wibro.in
// pm2-service-down = for pm2 service down alert
// customer-support-ticket = for customer support ticket from erp of sales

export const sendMessageGroupValidation = [
  body('sessionId')
    .notEmpty()
    .withMessage('Session ID is required')
    .isString()
    .withMessage('Session ID must be a string'),

  body('groupId')
    .notEmpty()
    .withMessage('Group ID is required')
    .isString()
    .withMessage('Group ID must be a string'),

  body('message')
    .notEmpty()
    .withMessage('Message is required')
    .isString()
    .withMessage('Message must be a string'),
];

export const sendMessageValidation = [
  body('sessionId')
    .notEmpty()
    .withMessage('Session ID is required')
    .isString()
    .withMessage('Session ID must be a string'),

  body('phoneNumber')
    .notEmpty()
    .withMessage('Phone is required')
    .isString()
    .withMessage('Phone must be a string'),

  body('message')
    .notEmpty()
    .withMessage('Message is required')
    .isString()
    .withMessage('Message must be a string'),

  body('devicePhone')
    .notEmpty()
    .withMessage('Device Phone is required')
    .custom((value) => {
      if (value.length < 10) {
        throw new Error('Device Phone must be 12 digits');
      }
      return true;
    })
    .isString()
    .withMessage('Device Phone must be a string'),
];

export const startSessionValidation = [
  body('devicePhone')
    .notEmpty()
    .withMessage('Device Phone is required')
    .custom((value) => {
      if (value.length < 10) {
        throw new Error('Device Phone must be 12 digits');
      }
      return true;
    })
    .isString()
    .withMessage('Device Phone must be a string'),
  body('sessionId')
    .notEmpty()
    .withMessage('Session ID is required')
    .isString()
    .withMessage('Session ID must be a string'),
];
