import { body } from 'express-validator';

export const createDeviceValidation = [
    body('deviceName')
        .notEmpty().withMessage('Device name is required')
        .trim()
        .isLength({ min: 2 }).withMessage('Device name must be at least 2 characters long'),
    
    body('devicePhone')
        .notEmpty().withMessage('Device phone number is required')
        .trim()
        .isMobilePhone().withMessage('Invalid phone number'),
];