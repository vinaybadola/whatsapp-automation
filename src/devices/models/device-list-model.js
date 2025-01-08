import mongoose from 'mongoose';
const {Schema} = mongoose;

const deviceListSchema = new Schema({
    deviceName: {type: String, required: true},
    devicePhone : {type: String, required: true},
    status : {type : String , enum : ['online','offline'], default : 'offline'},
    apiToken : {type : String, required : true},
    totalDevices : {type : Number, default : 0},
    user_id : {type : Schema.Types.ObjectId, ref : 'user'}, 
},{timestamps: true});

const DeviceListModel=mongoose.model('device-list', deviceListSchema);

export default DeviceListModel;