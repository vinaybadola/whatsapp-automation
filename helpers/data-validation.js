import { validationResult } from 'express-validator';

export const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
};

export const errorResponseHandler = (errorMessage, ErrorStatusCode, res) =>{
  console.error(`Error: ${errorMessage}`);
  return res.status(ErrorStatusCode).json({success: false,message: errorMessage });
}
  