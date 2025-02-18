// create a middleware to check if the token that is passed is valid or not from the token value in .env

import { verify } from 'jsonwebtoken';
import { jwtSecret } from '../config/envConfig.js';

const verifyToken = (req, res, next) => {
    const token = req.headers['x-access-token'];
    if (!token) {
        return res.status(403).send({ message: 'No token provided!' });
    }

    verify(token, jwtSecret, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: 'Unauthorized!' });
        }
        req.userId = decoded.id;
        next();
    });
};

export default verifyToken;