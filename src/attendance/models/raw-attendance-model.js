import mongoose from "mongoose";
const {Schema} = mongoose;

const rawAttendanceSchema = new Schema({
    employeeId : { type : String,required : true},
    dateTime : { type : Date,required : true},
    deviceId : { type : String,required : true},
    status : {type : Boolean, default: true},  // true means to be processed, false means processed
    remarks : {type : String}
}, {timestamps: true});

const RawAttendance = mongoose.model('raw-attendance', rawAttendanceSchema);

export default RawAttendance;