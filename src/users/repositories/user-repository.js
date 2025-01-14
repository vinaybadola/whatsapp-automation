import User from '../models/user-model.js';

export default class UserRepository {
    async getUserById(userId) {
        return await User.findById(userId).populate('customRole', 'name');
    }

    async getUserByEmail(email) {
        return await User.findOne({ email });
    }

    async updateUser(userId, updateData) {
        return await User.findByIdAndUpdate(userId, updateData, { new: true });
    }

    async deleteUser(userId) {
        return await User.findByIdAndDelete(userId);
    }

    async getUserData(data) {
        return await User.find({
          $or: [
            { email: data.email },
            { userName: data.userName },
            { phone: data.phone },
          ],
        });
    }

    async findUserByField(data, id){
      return await User.findOne({
         data,
         _id: { $ne: id } 
      })
    }

    async findOne(data){
      return await User.findOne(data);
    }
}
