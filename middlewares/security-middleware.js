import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import bodyParser from 'body-parser';
import express from 'express';
import  cookieParser  from 'cookie-parser';

const securityMiddleware = (app) => {
  app.use(express.json());
  
  // Use URL-encoded parser middleware
  app.use(bodyParser.urlencoded({ extended: true }));
  
  app.use(compression());
  app.use(cookieParser());
  
  app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'], 
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
  }));
  
  app.use(helmet());
  
  // Enable cross-origin resource policy (CORS) for better security
  app.use(helmet.crossOriginResourcePolicy({ policy: 'cross-origin' }));
  
};

export default securityMiddleware;