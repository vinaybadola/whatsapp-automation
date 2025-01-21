import mongoose from "mongoose";
const {Schema} = mongoose;

const GroupParticipantsSchema = new Schema({
    groupId : {type : Schema.Types.ObjectId, ref: 'user-group'},
    userId : {type : Schema.Types.ObjectId, ref: 'user', required: true, index : true},
    phoneNumber: { type: String, required: true, match: /^\+\d{1,15}$/ },
    name: { type: String },
    email: { type: String },
}, {timestamps: true});

GroupParticipantsSchema.index({ groupId: 1 });

const GroupParticipants = mongoose.model('group-participants', GroupParticipantsSchema);

export default GroupParticipants;