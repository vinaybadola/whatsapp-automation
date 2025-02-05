import mongoose from 'mongoose';
const {Schema} = mongoose;

const messageTrackerSchema = new Schema({
    jobId : {type : String, required : true},
    senderId : {type : String, required : true},
    receiverId : {type : String, required : true},
    status : {type : String, enum :['sent', 'failed'], required : true},
    error : {type : String},
    userId : {type : String, required : true},
    mode : {type : String, required : true},
    sentVia : {type : String, enum : ['individual', 'group'], required : true},
    message : {type : String, required : true},
    lead_source : {type : String,default: 'whatsapp'},
}, {timestamps: true});

export default mongoose.model('MessageTracker', messageTrackerSchema);