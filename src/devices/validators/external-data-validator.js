import { body } from 'express-validator';

export const userQueryValidation = [
    body('data')
        .notEmpty().withMessage('Data is required')
        .isObject().withMessage('Data must be an array'),
    
    body('source')
        .notEmpty().withMessage('Source is required')
        .isString().withMessage('Source must be a string'),
    
    body('type')
        .notEmpty().withMessage('Type is required')
        .isString().withMessage('Type must be a string')
        .isIn(['sales-query', 'website-inquiry', 'gtel-website-inquiry', 'wibro-website-query', "pm2-service-down", "sales-ticket"]).withMessage('Invalid type'),
];

// sales-query = for third party whatsapp service (refrence sandeep shukla )
// gtel-website-inquiry = for website inquiry of gtel.in
// wibro-website-query = for website inquiry of wibro.in
// pm2-service-down = for pm2 service down alert
// customer-support-ticket = for customer support ticket from erp of sales