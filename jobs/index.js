import runFetchUserAttendanceJob from '../jobs/job-data/fetch-user-attendance.js';

const runJobs = () => {
  runFetchUserAttendanceJob();
};

module.exports = runJobs;