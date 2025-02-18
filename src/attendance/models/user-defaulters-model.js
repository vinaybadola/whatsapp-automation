import mongoose from 'mongoose';
const {Schema} = mongoose;

const DefaultersSchema = new Schema({
    employeeCode : {type : String, required : true},
    punchInTime : {type : Date},
    punchOutTime : {type : Date},
    isLate : {type: Boolean, default: false},
    lateByTime : {type : String},
    lateDayCount : {type : Number},
    isLeavingEarly : {type:Boolean, default : false},
    earlyBy : {type:String},
    date : {type : Date, default : Date.now}
},{timestamps :true});

const Defaulters = mongoose.model('Defaulters', DefaultersSchema);

export default Defaulters;