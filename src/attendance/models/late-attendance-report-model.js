import mongoose from 'mongoose';
const {Schema} = mongoose;

const lateAttendanceReportSchema = new Schema({
    chartUrl : { type : String},
    lateEmployeesCount : { type : Number,required : true},
    lateEmployees : {type : Array,required : true},
    date : { type : Date, default : Date.now},
}, {timestamps: true});

const LateAttendanceReport = mongoose.model('late-attendance-report', lateAttendanceReportSchema);

export default LateAttendanceReport;
