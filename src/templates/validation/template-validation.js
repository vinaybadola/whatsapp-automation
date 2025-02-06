import { body, param } from "express-validator";

const templateValidation = {
  createTemplate: [
    body("subject")
      .notEmpty()
      .withMessage("Subject is required")
      .isString()
      .withMessage("Subject must be a string"),
    
    body("template")
      .notEmpty()
      .withMessage("Template is required")
      .isString()
      .withMessage("Template must be a string"),

    body("templateType")
      .notEmpty()
      .withMessage("Template type is required")
      .isString()
      .withMessage("Template type must be a string"),

      body("shouldBeSentToGroup")
      .notEmpty()
      .withMessage("Should be sent to group is required")
      .isBoolean(),
  
    body("groupConfigurationId")
      .if(body("shouldBeSentToGroup").equals(true)) 
      .notEmpty()
      .withMessage("Group configuration ID is required")
      .isMongoId()
      .withMessage("Invalid group configuration ID"),

    ],
    deleteTemplate: [
        param("id").isMongoId().withMessage("Invalid template ID").not().isEmpty().withMessage("Template ID is required") 
    ],

    getTemplate: [
        param("id").isMongoId().withMessage("Invalid template ID").not().isEmpty().withMessage("Template ID is required") 
    ],
};

export default templateValidation;
