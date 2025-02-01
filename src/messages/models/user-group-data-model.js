import mongoose from 'mongoose';
const {Schema} = mongoose;

const userGroupSchema = new Schema({
    groupName : {type : String, required: true}, // group name from whatsapp
    groupjid : {type : String, unique: true, sparse: true}, // group id from whatsapp 
    userId : {type : Schema.Types.ObjectId, ref: 'User', required: true, index: true}, // user who created the group
    isCustomGroup: { type: Boolean, default: false }, // Flag to indicate a custom group
}, {timestamps: true});

userGroupSchema.index({ userId: 1, groupId: 1 });

const userGroup = mongoose.model('user-group', userGroupSchema);

export default userGroup;