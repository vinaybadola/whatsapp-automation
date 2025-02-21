import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import bodyParser from 'body-parser';
import express from 'express';
import  cookieParser  from 'cookie-parser';
import {allowedOrigins,allowedMethods,allowedCredentials,allowedHeaders,allowedExposedHeaders} from "../config/envConfig.js";

const securityMiddleware = (app) => {
  
  app.use(cors({
    origin: allowedOrigins, 
    methods: allowedMethods, 
    credentials: allowedCredentials,
    allowedHeaders: allowedHeaders,
    exposedHeaders: allowedExposedHeaders
  }));

  app.use(express.json());
  
  // Use URL-encoded parser middleware
  app.use(bodyParser.urlencoded({ extended: true }));
  
  app.use(compression());
  app.use(cookieParser());
  
  
  app.use(helmet());
  
  // Enable cross-origin resource policy (CORS) for better security
  app.use(helmet.crossOriginResourcePolicy({ policy: 'cross-origin' }));
  
};

export default securityMiddleware;