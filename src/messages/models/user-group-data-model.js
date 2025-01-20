import mongoose from 'mongoose';
const {Schema} = mongoose;

const userGroupSchema = new Schema({
    groupName : {type : String, required: true}, // group name from whatsapp
    groupId : {type : String, required: true, unique: true, index: true}, // group id from whatsapp
    isParticipantSaved : {type : Boolean, default : false}, // if the participants are saved in the database
    participants : [{type : Schema.Types.ObjectId, ref: 'group-participants'}], // participants in the group
    userId : {type : Schema.Types.ObjectId, ref: 'User', required: true, index: true}, // user who created the group
}, {timestamps: true});

const userGroup = mongoose.model('user-group', userGroupSchema);

export default userGroup;