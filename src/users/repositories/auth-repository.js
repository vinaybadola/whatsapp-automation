import userModel from "../models/user-model.js";
import bcrypt from 'bcryptjs';

export default class AuthRepository {

    /** 
     * @param {Object} user
     * @returns {Promise<Object>}
     */
    async createUser(user){
        try{
            const newUser = new userModel(user);
            newUser.generateAuthToken(); 
            await newUser.save();
            return newUser ;
        }
        catch(err){
            throw new Error(`Error creating user: ${err.message}`);
        }
    }

    async findOne(data){
        try{
            return await userModel.findOne(data);
        }
        catch(err){
            throw new Error(`Error finding user by email: ${err.message}`);
        }
    }

    /**
   * @param {string} email
   * @param {string} password
   * @returns {Promise<string>}
   */

    async loginUser(user){
        try{
            const {email, password} = user;
            const foundUser = await userModel.findOne({ email });
            if(!foundUser){
                throw new Error("User not found");
            }
            const isMatch = await bcrypt.compare(password, foundUser.password);

            if(!isMatch){
                throw new Error("Invalid credentials");
            }

            const UserModel = new userModel();
            const token = UserModel.generateAuthToken(); 
            await foundUser.save();
            user.password = undefined;

            return token;
            }
        catch(err){
            throw new Error(`Error logging in user: ${err.message}`);
        }
    }

    async logoutUser(user){
        try{
            user.tokens = [];
            await user.save();
        }
        catch(err){
            throw new Error(`Error logging out user: ${err.message}`);
        }
    }

    async resetPassword(user){
        try{
            const {email, oldPassword, password} = user;
            const foundUser = await userModel.findOne({
                email
            });
            if(!foundUser){
                throw new Error("User not found");
                }
            const isMatch = await bcrypt.compare(oldPassword, foundUser.password);
            if(!isMatch){
                throw new Error("Invalid credentials");
                }
            foundUser.password = password;
            await foundUser.save();
            user.password = undefined;
            return "Password reset successfully";

            }
            catch(err){
                throw new Error(`Error resetting password: ${err.message}`);
            }
    }
}
