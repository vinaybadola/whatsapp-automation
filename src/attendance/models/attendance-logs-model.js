import mongoose from "mongoose";
const {Schema} = mongoose;

const attendanceLogsSchema = new Schema({
    employeeCode : {type : String, required : true, index: true},
    reasonForNotProcessing : {type: String},
    rawData : [{
        type: String
    }],
    remarks: {type : String},
    updatedBy : {type : String},
    ip : {type : String},
    updatedAt : {type : Date , default : Date.now()}
}, {timestamps : true});

const attendanceLogs = mongoose.model('User-attendance', attendanceLogsSchema);
export default attendanceLogs;