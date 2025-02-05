import mongoose from "mongoose";
const {Schema} = mongoose;

const GroupConfigurationSchema = new Schema({
    name: {type: String, required: true},
    devicePhone: {type: String, required: true},
    description: {type: String},
    apiToken : {type : String, required : true},
    groupId : {type : String, required : true},
    templateId : {type : Schema.Types.ObjectId, ref : 'Template', required : true},
    type : {type : String, required : true},
    is_active : {type : Boolean, default: true},
}, {timestamps: true});

export default mongoose.model('group-configuration', GroupConfigurationSchema);
