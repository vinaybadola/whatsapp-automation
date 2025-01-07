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


  async findUserByField(field) {

  }

}