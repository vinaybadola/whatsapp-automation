import {body} from 'express-validator';

export const sendMessageValidator =[
    body('name').isString().withMessage('Name must be a string'),
    body('email').isEmail().withMessage('Email must be a valid email'),
    body('phone').notEmpty().isNumeric().withMessage("Phone Number is required"),
    body('city').notEmpty().withMessage("City is required"),
    body('service_type').notEmpty().withMessage("Service type is required"),
    body("support_type").notEmpty().withMessage("Support type is required")
]

export const processInterestedUserValidator = [
    body('phone')
        .trim()
        .notEmpty().withMessage("Phone Number is required")
        .isMobilePhone('en-IN').withMessage("Invalid phone number format"),
    
    body('response')
        .trim()
        .notEmpty().withMessage("Response is required")
        .toLowerCase() 
        .isIn(['yes', 'no']).withMessage("Response must be either 'yes' or 'no'"),
    
    body('source')
        .trim()
        .notEmpty().withMessage("Source is required")
        .isString().withMessage("Source must be a string"),
    
    body('type')
        .trim()
        .notEmpty().withMessage("Type is required")
        .isString().withMessage("Type must be a string")
        .isIn(['sales-query']).withMessage("Type must be 'sales-query'")
];