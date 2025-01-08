import UserService from '../services/user-service.js';
import UserRepository from '../repositories/user-repository.js';
import {log} from "../../../utils/logger.js";

const userRepository = new UserRepository();

export default class UserController {
    constructor() {
        this.userService = new UserService(userRepository);
        this.userRepository = new UserRepository();
    }

    getUserById = async (req, res) => {
        try {
            const userId = req.user.id || req.user._id;
            const user = await this.userService.getUserById(userId);
            if (!user) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }
            return res.status(200).json({success: true, message: 'User found', user});
        } catch (error) {
            log.error('An unexpected error occurred while getting user by ID :', error);
            if(error instanceof Error){
                return res.status(500).json({ success: false, error: error.message });
            }
            return res.status(500).json({ success: false, error: 'An unexpected error occurred' });
        }
    }

    updateUser = async (req, res) => {
        try {
            const userId = req.user.id || req.user._id;
            const updateData = req.body;
            const profileImage = req.file ? req.file.path : null;
    
            const updatedUser = await this.userService.updateUser(userId, updateData, profileImage);
    
            return res.status(200).json({success: true, message: 'User updated successfully', updatedUser});
        } catch (error) {
            log.error(`An unexpected error occurred while updating user: ${error.message}`);
    
            // Handle specific errors
            if (error.message === 'Conflict') {
                return res.status(400).json({ errors: error.conflicts });
            }
    
            return res.status(500).json({ success: false, error: 'An unexpected error occurred' });
        }
    };
    
}