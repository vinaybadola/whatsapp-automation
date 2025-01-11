import mongoose from "mongoose";
const {Schema} = mongoose;

const CustomRoleSchema = new Schema({
    name: {type: String, required: true},
    description: {type: String, required: true},
    status : {type: Boolean, default: true},
},{timestamps : true});

export default mongoose.model('customr-roles-schema', CustomRoleSchema);