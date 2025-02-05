import { body, param } from "express-validator";

const createValidator = [
    body("name")
        .trim()
        .notEmpty()
        .withMessage("Name is required")
        .isString()
        .withMessage("Name must be a string"),

    body("devicePhone")
        .trim()
        .notEmpty()
        .withMessage("Device phone is required")
        .matches(/^\+?[1-9]\d{9,14}$/)
        .withMessage("Invalid phone number format"),

    body("description")
        .optional()
        .isString()
        .withMessage("Description must be a string"),

    body("apiToken")
        .trim()
        .notEmpty()
        .withMessage("API Token is required")
        .isString()
        .withMessage("API Token must be a string"),

    body("groupId")
        .trim()
        .notEmpty()
        .withMessage("Group ID is required")
        .isString()
        .withMessage("Group ID must be a string"),

    body("templateId")
        .trim()
        .notEmpty()
        .withMessage("Template ID is required")
        .isMongoId()
        .withMessage("Invalid Template ID format"),

    body("type")
        .trim()
        .notEmpty()
        .withMessage("Type is required")
        .isString()
        .withMessage("Type must be a string"),

    body("is_active")
        .optional()
        .isBoolean()
        .withMessage("is_active must be a boolean"),
];

const idValidator = [
    param("id")
    .trim()
    .notEmpty()
    .withMessage("ID is required")
    .isMongoId()
    .withMessage("Invalid ID format"),
]
export { createValidator, idValidator };

