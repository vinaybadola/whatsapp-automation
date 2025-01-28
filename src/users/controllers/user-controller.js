import UserService from '../services/user-service.js';
import UserRepository from '../repositories/user-repository.js';
import { paginate, paginateReturn} from '../../../helpers/pagination.js';

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
            user.password = undefined;
            if (!user) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }
            return res.status(200).json({success: true, message: 'User found', user});
        } catch (error) {
            console.error('An unexpected error occurred while getting user by ID :', error);
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
            console.error(`An unexpected error occurred while updating user: ${error.message}`);
    
            // Handle specific errors
            if (error.message === 'Conflict') {
                return res.status(400).json({ errors: error.conflicts });
            }
    
            return res.status(500).json({ success: false, error: 'An unexpected error occurred' });
        }
    };

    getAllUsers = async(req,res) =>{
        try{
            const {page, limit, skip} = paginate(req);
            const users = await this.userService.getAllUsers(skip,limit);

            if(users.length === 0){
                return res.status(404).json({success: false, message: 'No users found'});
            }

            return res.status(200).json({success: true, message: 'Users retrieved successfully', data: users, pagination: paginateReturn(page, limit, users.length)});
        }
        catch(error){
            console.error(`An unexpected error occurred while getting all users: ${error.message}`);
            if(error instanceof Error){
                return res.status(400).json({ success: false, error: error.message });
            }
            return res.status(500).json({ success: false, error: 'An unexpected error occurred' });
        }
    }

    changeUserRole = async(req,res) =>{
        try{
            const {userId, roleId} = req.body;
            await this.userService.changeUserRole(userId, roleId);
            return res.status(200).json({success: true, message: 'User role updated successfully '});
        }
        catch(err){
            console.error(`An unexpected error occurred while changing user role: ${err.message}`);
            if(err instanceof Error){
                return res.status(400).json({success: false, error: err.message});
            }
            return res.status(500).json({ success: false, error: 'An unexpected error occurred ' });
        }
    }

    createRole = async(req,res)=>{
        try{
            await this.userService.createRole(req.body);
            return res.status(200).json({success: true, message: 'Role created successfully'});
        }
        catch(err){
            console.error(`An unexpected error occurred while creating role: ${err.message}`);
            if(err instanceof Error){
                return res.status(400).json({ success: false, error: err.message });
            }
            return res.status(500).json({ success: false, error: `An unexpected error occurred while creating role : ${err.message}`  });
        }
    }

    getAllRoles = async(req,res) =>{
        try{
            const {page = 1, limit = 10} = paginate(req);
            const roles = await this.userService.getRoles(page, limit);
            const totalItems = roles.length;
            if(!totalItems){
                return res.status(404).json({success: false, message: 'No roles found'});   
            }
            return res.status(200).json({success: true, message: 'Roles retrieved successfully',
                data: roles,
                pagination: {
                    paginate : paginateReturn(page, limit, totalItems)
                }
            });
        }
        catch(err){
            console.error(`An unexpected error occurred while getting all roles: ${err.message}`);
            if(err instanceof Error){
                return res.status(400).json({success: false, error: err.message});
            }
            return res.status(500).json({ success: false, error: `An unexpected error occurred : ${err.message}` });
        }

    }

    getRoleById = async(req,res)=>{
        try{
            const id = req.params.id;
            const role = await this.userService.getRoleById(id);
            if(!role){
                return res.status(404).json({success: false, message: 'Role not found'});
            }
            return res.status(200).json({success: true, message: 'Role retrieved successfully', data: role});
        }
        catch(err){
            console.error(`An unexpected error occurred while getting role by id: ${err.message}`);
            if(err instanceof Error){
                return res.status(400).json({success: false, error: err.message});
            }
            return res.status(500).json({ success: false, error: `An unexpected error occurred while getting role by id : ${err.message}`  });
        }
    }

    updateRole = async(req,res)=>{
        try{
            const id = req.params.id;
            const role = await this.userService.updateRole(id, req.body);
            if(!role){
                return res.status(404).json({success: false, message: 'Role not found'});
            }
            return res.status(200).json({success: true, message: 'Role updated successfully', data: role});
        }
        catch(err){
            console.error(`An unexpected error occurred while updating role: ${err.message}`);
            if(err instanceof Error){
                return res.status(400).json({success: false, error: err.message});
            }
            return res.status(500).json({ success: false, error: `An unexpected error occurred while updating role : ${err.message}`  });
        }
    }
}