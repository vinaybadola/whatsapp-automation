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
        .isIn(['sales-query', 'website-inquiry', 'gtel-website-inquiry']).withMessage('Invalid type'),
];