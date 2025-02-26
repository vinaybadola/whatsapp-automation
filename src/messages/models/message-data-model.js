import mongoose from 'mongoose';
const {Schema} = mongoose;

const MessageSchema = new Schema({
    sessionId: {type: String, required: true},
    phoneNumber : {type: String},
    message: {type: String},
    status: { type: String, enum: ['pending', 'sent', 'failed'], default: 'pending' },
    senderId : {type : Schema.Types.ObjectId, ref: 'User'},
    sentVia : {type : String, enum : ['group', 'individual']},
    groupId : {type : String},
    reasonForFailure: {type: String , default : null},
    messageTrackerId : {type : Schema.Types.ObjectId, ref : 'MessageTracker', index : true},
}, {timestamps: true});

const Message = mongoose.model('message-data', MessageSchema);

export default Message;