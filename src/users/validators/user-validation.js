import { body , param} from 'express-validator';

export const userRoleChangeValidation = [
    body('userId')
    .notEmpty()
    .withMessage('User ID is required')
    .isMongoId()
    .withMessage('Invalid User ID'),

    body('roleId')
    .notEmpty()
    .withMessage('Role ID is required')
    .isMongoId()
    .withMessage('Invalid Role ID')
];

export const validateId =[
    param('id')
    .notEmpty()
    .withMessage('ID is required')
    .isMongoId()
    .withMessage('Invalid ID')
];

export const roleValidation =[
    body('name')
    .notEmpty()
    .withMessage('Role name is required')
    .isLength({min:3})
    .withMessage('Role name must be at least 3 characters long'),

    body('description')
    .optional()
    .isLength({min:3})
    .withMessage('Description must be at least 3 characters long'),

    body('status')
    .optional()
    .isIn(['true', 'false'])
    .withMessage('Invalid status')
];


