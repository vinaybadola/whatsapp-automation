import AuthRepository from "../repositories/auth-repository.js";
import UserRepository from '../repositories/user-repository.js';
import AuthService from '../services/auth-service.js';
const authRepository = new AuthRepository();

export default class AuthController { 
  constructor() {
    this.userRepository = new UserRepository();
    this.authService = new AuthService(authRepository, this.userRepository);
  }

  register = async (req, res) => {
    try {
      const user = req.body;
      const existingUser = await this.userRepository.getUserData({ email: user.email, userName: user.userName, phone: user.phone });
      if (existingUser.length > 0) {
        const existingFields = [];
        if (existingUser.some((u) => u.email === user.email)) {
          existingFields.push('email');
        }
        if (existingUser.some((u) => u.userName === user.userName)) {
          existingFields.push('username');
        }
        if (existingUser.some((u) => u.phone === user.phone)) {
          existingFields.push('phone');
        }
        return res.status(400).json({ message: `User already exists with the same ${existingFields.join(', ')}` });
      }
      if(req.file && req.file.length > 0){
        user.profileImage = req.file.path;
      }
      else{
        user.profileImage = 'uploads/user-default-image.jpg';
      }
      const data = await this.authService.registerUser(user);
      if (!data) {
        return res.status(400).json({ message: 'User not created' });
      }
      const token = data.tokens[0].token;
      res.cookie('authcookie', token , {
        httpOnly: true, 
        secure: process.env.NODE_ENV === 'PRODUCTION', 
        maxAge: 7 * 24 * 60 * 60 * 1000, 
      });
      
      return res.status(201).json({ message: 'User created succesfully'});
    }
    catch (error) {
      console.error(`An unexpected error occurred while creating user in controller. ${error.message}`);
      if (error instanceof Error) {
        return res.status(400).json({ message: "validation Exception", success: false, error: error.message });
      }
      return res.status(500).json({ success: false, error: 'An unexpected error occurred' });
    }

  }

  login = async (req,res) => {
    try {
      const user = req.body;
      const token = await this.authService.loginUser(user);
      if (!token) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      res.cookie('authcookie', token , {
        httpOnly: true, 
        secure: process.env.NODE_ENV === 'PRODUCTION', 
        maxAge: 7 * 24 * 60 * 60 * 1000, 
      });

      return res.status(200).json({ message: 'Login successful' });

    } catch (error) {
      console.error(`An unexpected error occurred while logging in user in controller. ${error.message}`);
      if (error instanceof Error) {
        return res.status(400).json({ success: false, error: error.message });
      }
      return res.status(500).json({success: false, error: error.message });
    }
  };

  logout = async (req, res) => {
    try {
      res.clearCookie('authcookie', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'PRODUCTION',
        sameSite: 'strict',
      });
  
      return res.status(200).json({ message: 'Logged out successfully' });
    } catch (error) {
      console.error(`An unexpected error occurred while logging out. ${error.message}`);
      if (error instanceof Error) {
        return res.status(400).json({ error: error.message });
      }
      return res.status(500).json({ success: false, error: `An unexpected error occurred while logging out : ${error.message}` });
    }
  
  };

  deactivateAccount = async (req, res) => {
    try{
      const userId = req.user?._id || req.user?.id;
      const user = await this.userRepository.findOne({ _id: userId });
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      user.status = false;
      await user.save();
    }
    catch (error) {
      console.error(`An unexpected error occurred while deactivating user account. ${error.message}`);
      if (error instanceof Error) {
        return res.status(400).json({ error: error.message });
      }
      return res.status(500).json({ success: false, error: `An unexpected error occurred while deactivating user account : ${error.message}` });
    }
  }

}