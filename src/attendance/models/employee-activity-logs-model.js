import mongoose from "mongoose";
const {Schema} = mongoose;

const EmployeeActivityLogsSchema = new Schema({
    employeeCode : {type : String, required : true, index: true},
    remarks: {type : String},
    punchTime : {type : Date, required : true},
    deviceId : {type : String},
    action : {type : String, trim : true}
}, {timestamps : true});

const EmployeeActivityLogs = mongoose.model('employee-activity', EmployeeActivityLogsSchema);
export default EmployeeActivityLogs;