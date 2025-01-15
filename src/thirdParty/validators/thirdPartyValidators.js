import {body} from 'express-validator';

export const sendMessageValidator =[
    body('name').isString().withMessage('Name must be a string'),
    body('email').isEmail().withMessage('Email must be a valid email'),
    body('phone').notEmpty().isNumeric().withMessage("Phone Number is required"),
    body('city').notEmpty().withMessage("City is required"),
    body('service_type').notEmpty().withMessage("Service type is required"),
    body("support_type").notEmpty().withMessage("Support type is required")
]