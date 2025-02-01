import mongoose from 'mongoose';
const { Schema } = mongoose;

const UserRoleRelationSchema = new Schema({
    userId : {type : Schema.Types.ObjectId, ref : 'user', required: true}, 
    roleId : {type : Schema.Types.ObjectId, ref : 'customr-roles-schema', required: true},
},{timestamps : true});

export default mongoose.model('user-role-relation', UserRoleRelationSchema);