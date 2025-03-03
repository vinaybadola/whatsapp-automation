import AttendanceService from '../src/attendance/services/attendance-service.js';
import connectDB from '../config/database.js';
import {mergePunches} from "../jobs/job-data/fetch-user-attendance.js";
// Connect to the database
connectDB();
// Create an instance of the AttendanceService class
const attendanceService = new AttendanceService();

// Test data
const testAttendanceData = [
  {
    EmpCode: 'WIBRO0065',
    DateTime: '2025-03-03T10:08:02.000Z',
    DeviceId: 'DELHI'
  },
  // {
  //   EmpCode: 'WIBRO0065',
  //   DateTime: '2025-02-T19:03:12.000Z',
  //   DeviceId: 'DELHI'
  // },
  // {
  //   EmpCode: 'WIBRO0065',
  //   DateTime: '2025-02-T19:03:20.000Z',
  //   DeviceId: 'DELHI'
  // },
  // {
  //   EmpCode: 'WIBRO0065',
  //   DateTime: '2025-02-T19:03:30.000Z',
  //   DeviceId: 'DELHI'
  // },

  
];
const updatedata = mergePunches(testAttendanceData)

// Call the processAttendanceData method
attendanceService.processShiftType(updatedata)
  .then(results => {
    console.log('Test results:', results);
    process.exit(0);
  })
  .catch(error => {
    console.error('Error during test:', error);
    return 0;
  });