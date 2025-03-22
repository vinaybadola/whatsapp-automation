import mongoose from 'mongoose';
const {Schema} = mongoose;

const userAttendanceSchema = new Schema({
    employeeName:{ type:String},
    employeeCode:{ type:String,required:true, sparse:true, index:true},
    actualPunchInTime:{ type:Date,required:true},
    userpunchInTime : { type:Date,required:true},
    actualPunchOutTime : { type:Date,required:true},
    userPunchOutTime : { type:Date,required:true},
    totalHours : { type:String,required:true},
    isOnTime : { type:Boolean, default:true},
    isLeavingEarly : { type:Boolean, default:false},
    isHalfDay : { type:Boolean, default:false},
    isAbsent : { type:Boolean, default:false},
    deviceId : { type:String,required:true},
    hasMessageSent : {type:Boolean},
    isTodayOff : {type:Boolean, default : false},
    hasPunchedIn : {type:Boolean, default : false},
    hasPunchedOut : {type:Boolean, default : false},
    isValidPunch : {type:Boolean, default : false},
    reasonForNotSendingMessage : {type:String, default : null},
    isNightShift : {type:Boolean, default : false},
    isDayShift : {type:Boolean, default : false},
    status : {type: Boolean , default : true},
    isShiftCompleted : {type: Boolean, default : false},
}, {timestamps: true});

const UserAttendance = mongoose.model('User-attendance', userAttendanceSchema);
export default UserAttendance;