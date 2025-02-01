import mongoose from "mongoose";
const {Schema} = mongoose;

const GroupDataSchema = new Schema({
    name: {type: String, required: true},
    description: {type: String},
    groupName: {type: String, required: true},
    adminNumber: {type: String, required: true},
    is_active : {type : Boolean, default: true}
},{timestamps: true});

export default mongoose.model('group-data', GroupDataSchema);