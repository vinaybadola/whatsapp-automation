const mongoose = require('mongoose');
const {Schema} = mongoose;

const userAttendanceSchema = new Schema({
    EmpCode:{ type:String,required:true, unique:true, sparse:true},
    DateTime:{ type:Date,required:true},
    ActualPunchInTime:{ type:Date,required:true},
    UserpunchInTime : { type:Date,required:true},
    ActualPunchOutTime : { type:Date,required:true},
    UserPunchOutTime : { type:Date,required:true},
    TotalHours : { type:Number,required:true},
    isHalfDay : { type:Boolean, default:false},
    isAbsent : { type:Boolean, default:false},
    DeviceId : { type:String,required:true},
    hasMessageSent : {type:Boolean},
    isTodayOff : {type:Boolean},
    isLate : {type:Boolean},
    lateBy : {type:Number, default : 0},
    isLeavingEarly : {type:Boolean, default : false},
    earlyBy : {type:Number, default : 0},
    reasonForFailure : {type:String, default : null}
}, {timestamps: true});

const UserAttendance = mongoose.model('UserAttendance', userAttendanceSchema);
export default UserAttendance;