import { body, param } from 'express-validator';

export const validateNewUserData = [
  body('name')
    .notEmpty().withMessage('Name is required')
    .trim()
    .isLength({ min: 2 }).withMessage('Name must be at least 2 characters long'),

  body('email')
    .notEmpty().withMessage('Email is required')
    .trim()
    .isEmail().withMessage('Invalid email address')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required')
    .trim()
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*?&]{6,}$/)
    .withMessage('Password must contain at least one letter and one number'),

  body('confirmPassword')
    .notEmpty().withMessage('Confirm password is required')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),

  body('phone')
    .notEmpty().withMessage('Phone number is required')
    .trim()
    .isMobilePhone().withMessage('Invalid phone number'),

  body('language')
    .optional()
    .trim()
    .isString().withMessage('Language must be a string'),

  body('country')
    .optional()
    .trim()
    .isString().withMessage('Country must be a string'),

  body('status')
    .optional()
    .isBoolean().withMessage('Status must be a boolean'),

  body('userName')
    .notEmpty().withMessage('Username is required')
    .trim()
    .isLength({ min: 3 }).withMessage('Username must be at least 3 characters long'),

  body('profileImage')
    .optional()
    .trim()
    .isURL().withMessage('Profile image must be a valid URL'),
];

export const validateUpdateUserData = [
  param('id').isMongoId().withMessage('Invalid user ID'),

  body('name')
    .optional()
    .trim()
    .isLength({ min: 2 }).withMessage('Name must be at least 2 characters long'),

  body('email')
    .optional()
    .trim()
    .isEmail().withMessage('Invalid email address')
    .normalizeEmail(),

  body('password')
    .optional()
    .trim()
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),

  body('role')
    .optional()
    .isIn(['admin', 'user']).withMessage('Invalid role. Must be either "admin" or "user"'),

  body('phone')
    .optional()
    .trim()
    .isMobilePhone().withMessage('Invalid phone number'),

  body('language')
    .optional()
    .trim()
    .isString().withMessage('Language must be a string'),

  body('country')
    .optional()
    .trim()
    .isString().withMessage('Country must be a string'),

  body('status')
    .optional()
    .isBoolean().withMessage('Status must be a boolean'),

  body('userName')
    .optional()
    .trim()
    .isLength({ min: 3 }).withMessage('Username must be at least 3 characters long'),

  body('profileImage')
    .optional()
    .trim()
    .isURL().withMessage('Profile image must be a valid URL'),

  body('tokens')
    .optional()
    .isArray().withMessage('Tokens must be an array'),
];

export const validateLoginData = [
  body('email')
    .trim()
    .isEmail().withMessage('Invalid email address')
    .normalizeEmail(),

  body('password')
    .trim()
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),

]