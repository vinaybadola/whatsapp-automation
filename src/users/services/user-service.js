import customRolesModel from "../models/custom-roles-model.js";
import UserRoleRelationModel from "../models/user-role-relation-model.js";
export default class UserService {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  async getUserById(userId) {
    const user = await this.userRepository.getUserById(userId);
    return user;
  }

  async updateUser(userId, updateData, profileImage) {
    // Define the allowed fields that can be updated
    const allowedFields = ['name', 'email', 'phone', 'language', 'country', 'userName'];

    // Create a new object with only the allowed fields from updateData
    const filteredUpdateData = {};
    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        filteredUpdateData[field] = updateData[field];
      }
    }

    if (profileImage) {
      filteredUpdateData.profileImage = profileImage;
    }

    const conflicts = {};
    if (filteredUpdateData.email) {
      const existingUserWithEmail = await this.userRepository.findUserByField({ email: filteredUpdateData.email }, userId);
      if (existingUserWithEmail && existingUserWithEmail._id.toString() !== userId) {
        conflicts.email = 'Email already exists.';
      }
    }
    if (filteredUpdateData.userName) {
      const existingUserWithUsername = await this.userRepository.findUserByField({ userName: filteredUpdateData.userName }, userId);
      if (existingUserWithUsername && existingUserWithUsername._id.toString() !== userId) {
        conflicts.userName = 'Username already exists.';
      }
    }
    if (filteredUpdateData.phone) {
      const existingUserWithPhone = await this.userRepository.findUserByField({ phone: filteredUpdateData.phone }, userId);
      if (existingUserWithPhone && existingUserWithPhone._id.toString() !== userId) {
        conflicts.phone = 'Phone number already exists.';
      }
    }

    if (Object.keys(conflicts).length > 0) {
      const error = new Error('Conflict');
      error.conflicts = conflicts;
      throw error;
    }

    const updatedUser = await this.userRepository.updateUser(userId, filteredUpdateData);

    if (!updatedUser) {
      throw new Error('User not updated');
    }

    return updatedUser;
  }

  async changeUserRole(userId, roleId){
      // check if the user exist or markeed as status : true
      const user = await this.userRepository.getUserById(userId);
      if(!user || user.status !== true){
        throw new Error('User not found');
      }
      // check if the role exist or marked as status : true
      const role = await customRolesModel.findById(roleId);
      if(!role || role.status !== true){
        throw new Error('Role not found or marked as inactive or false!');
      }
      
      // assing user role or change the user role according to new role 
      const assignRole = await UserRoleRelationModel.findOneAndUpdate({userId: userId}, {roleId: roleId}, {new: true, upsert: true});
      if(!assignRole){
        throw new Error('User role not updated');
      }
  }

  async createRole(data){
    const existingRole = await customRolesModel.findOne({name: data.name});
    if(existingRole){
      throw new Error('Role already exists');
    }
    const role = new customRolesModel(data);
    const savedRole = await role.save();
    if(!savedRole){
      throw new Error('Role not created');
    }
  }

  async updateRole(id, data) {
    const role = await this.getRoleById(id);
    if (!role) {
      throw new Error('Role not found');
    }
    Object.assign(role, data);
    return await role.save();
  }

  async getRoles(page, limit) {
    return await customRolesModel.find().skip((page - 1) * limit).limit(limit);
  }

  async getRoleById(id){
    return await customRolesModel.findById(id);
  }

  async getAllUsers(skip,limit){
    const data = await this.userRepository.findAllUsers(skip,limit);
    data.forEach(user => {
      user.password = undefined;
      user.tokens = undefined;
      user.createdAt = undefined;
      user.updatedAt = undefined;
      user.__v = undefined;
    });
    return data;
  }

}