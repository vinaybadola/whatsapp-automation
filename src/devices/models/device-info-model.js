const mongoose = require('mongoose');
const {Schema} = mongoose;

const deviceInfoSchema = new Schema({
    openingTime : {type : String},
    closingTime : {type : String},
    device_id : {type : Schema.Types.ObjectId, ref : 'device-list'},
    subscribeKeyboard : {type : String},
    subscribeMessage : {type : String},
    welcomeMessage : {type : String},
    unsubscribe :  {type : String},
    unsubscribeMessage : {type : String},
    autoswitch : {type : String},
}, {timestamps: true});

const deviceInfo = mongoose.model('device-info', deviceInfoSchema);
export default deviceInfo;