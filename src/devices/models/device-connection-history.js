import mongoose from "mongoose";
const {Schema} = mongoose;

const deviceConnectionHistorySchema = new Schema({
    userId : {type : Schema.Types.ObjectId, ref : 'User', required : true},
    devicePhone : {type : String, required : true},
    deviceName : {type : String, required : true},
    history: [{
        connectedAt: { type: Date, default: Date.now },
        disconnectedAt: { type: Date },
        reasonForDisconnect: {type : String},
        duration : {type : Number}
    }],
    lastDisconnectedAt: { type: Date },
}, {timestamps: true});

deviceConnectionHistorySchema.index({createdAt : 1}, {expireAfterSeconds : 30 * 24 * 60 * 60});

const DeviceConnectionHistoryModel = mongoose.model('device-connection-history', deviceConnectionHistorySchema);

export default DeviceConnectionHistoryModel;