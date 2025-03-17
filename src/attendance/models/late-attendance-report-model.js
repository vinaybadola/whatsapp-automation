import mongoose from 'mongoose';
const {Schema} = mongoose;

const lateAttendanceReportSchema = new Schema({
    chartUrl : { type : String},
    lateEmployeesCount : { type : Number,required : true},
    lateEmployees : {type : Array,required : true},
    date : { type : Date,required : true},
}, {timestamps: true});

const LateAttendanceReport = mongoose.model('late-attendance-report', lateAttendanceReportSchema);

export default LateAttendanceReport;
