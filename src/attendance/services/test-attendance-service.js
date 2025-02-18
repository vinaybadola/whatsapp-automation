import AttendanceService from './attendance-service.js';
import connectDB from '../../../config/database.js';

// Connect to the database
connectDB();
// Create an instance of the AttendanceService class
const attendanceService = new AttendanceService();

// Test data
const testAttendanceData = [
  {
    EmpCode: 'WIBRO0065',
    DateTime: '2025-02-17T14:30:42.000Z',
    DeviceId: 'DELHI'
  }
];

// Call the processAttendanceData method
attendanceService.processAttendanceData(testAttendanceData)
  .then(results => {
    console.log('Test results:', results);
  })
  .catch(error => {
    console.error('Error during test:', error);
    return 0;
  });