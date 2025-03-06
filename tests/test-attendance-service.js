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
    DateTime: '2025-03-07T10:20:02.000Z',
    DeviceId: 'DELHI'
  },
  {
    EmpCode: 'WIBRO0065',
    DateTime: '2025-03-07T10:20:10.000Z',
    DeviceId: 'DELHI'
  },
  {
    EmpCode: 'WIBRO0065',
    DateTime: '2025-03-07T10:20:20.000Z',
    DeviceId: 'DELHI'
  },
  {
    EmpCode: 'WIBRO0065',
    DateTime: '2025-03-07T10:20:40.000Z',
    DeviceId: 'DELHI'
  },
];
if(testAttendanceData.length === 0){
  console.log('No new attendance data found');
  process.exit(0);
}
const updatedata = mergePunches(testAttendanceData)
console.log('updatedata',updatedata)

const processedData = await attendanceService.processRawData(updatedata)
console.log('processedData',processedData)
// Call the processAttendanceData method
attendanceService.processShiftType(processedData)
  .then(results => {
    console.log('Test results:', results);
    process.exit(0);
  })
  .catch(error => {
    console.error('Error during test:', error);
    return 0;
  });