import jwt from 'jsonwebtoken';
import User from '../src/users/models/user-model.js';
import { jwtSecret } from '../config/envConfig.js';

const customAuth = async (req, res, next) => {
  const token = req.cookies.authcookie;

  if (!token && token == undefined) {
    return res.status(401).json({ success: false, key: "token_not_provided", error: 'Access denied. No token provided.' });
  }
  console.log("Token:", token);
  try {
    const decoded = jwt.verify(token, jwtSecret);
    const user = await User.findById(decoded._id || decoded.id);
    if (!user) {
      return res.status(404).json({ success: false, key: "unknown_user", error: 'User not found.' });
    }

    const validToken = user.tokens.some(t => t.token === token);
    if (!validToken) {
      return res.status(401).json({ success: false, key: "token_false", error: 'Invalid or expired token.' });
    }

    req.user = {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone || '',
    };
    req.role = user.role;

    next();
  } catch (err) {
    console.error("Token verification error:", err);
    res.status(400).json({ success: false, key: "token_false", message: 'Invalid token.', error: err });
  }
};

export default customAuth;