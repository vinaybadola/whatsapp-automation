import {runFetchUserAttendanceJob} from '../jobs/job-data/fetch-user-attendance.js';
import {runFetchLateAttendanceReportJob} from '../jobs/job-data/attendance-report.js';

const runJobs = () => {
  runFetchUserAttendanceJob();
  runFetchLateAttendanceReportJob();
};

export default runJobs;