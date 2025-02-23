import mongoose from 'mongoose';
const {Schema} = mongoose;

const userAttendanceSchema = new Schema({
    employeeCode:{ type:String,required:true, sparse:true},
    actualPunchInTime:{ type:Date,required:true},
    userpunchInTime : { type:Date,required:true},
    actualPunchOutTime : { type:Date,required:true},
    userPunchOutTime : { type:Date,required:true},
    totalHours : { type:String,required:true},
    isHalfDay : { type:Boolean, default:false},
    isAbsent : { type:Boolean, default:false},
    deviceId : { type:String,required:true},
    hasMessageSent : {type:Boolean},
    isTodayOff : {type:Boolean, default : false},
    hasPunchedIn : {type:Boolean, default : false},
    hasPunchedOut : {type:Boolean, default : false},
    isValidPunch : {type:Boolean, default : false},
    reasonForNotSendingMessage : {type:String, default : null},
    hasProcessedToday : {type:Boolean, default : false},
}, {timestamps: true});

const UserAttendance = mongoose.model('User-attendance', userAttendanceSchema);
export default UserAttendance;