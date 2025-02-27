import AttendanceService from '../src/attendance/services/attendance-service.js';
import connectDB from '../config/database.js';

// Connect to the database
connectDB();
// Create an instance of the AttendanceService class
const attendanceService = new AttendanceService();

// Test data
const testAttendanceData = [
  {
    EmpCode: 'WIBRO0065',
    DateTime: '2025-02-27T19:03:42.000Z',
    DeviceId: 'DELHI'
  }
];

// Call the processAttendanceData method
attendanceService.processAttendanceData(testAttendanceData)
  .then(results => {
    console.log('Test results:', results);
    process.exit(0);
  })
  .catch(error => {
    console.error('Error during test:', error);
    return 0;
  });