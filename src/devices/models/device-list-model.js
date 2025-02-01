import mongoose from 'mongoose';
const {Schema} = mongoose;

const deviceListSchema = new Schema({
    deviceName: {type: String, required: true},
    devicePhone : {type: String, required: true, unique: true, index: true},
    status : {type : String , enum : ['online','offline'], default : 'offline'},
    apiToken : {type : String, required : true},
    userId : {type : Schema.Types.ObjectId, ref : 'user', required: true}, 
    sessionId: { type: String, ref: 'Session' },
    reasonForDisconnect: {type : String}
},{timestamps: true});

const DeviceListModel=mongoose.model('device-list', deviceListSchema);

export default DeviceListModel;