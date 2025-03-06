import cron from 'node-cron';
import { sql, connectMSSQL } from '../../config/mssql-database.js';

let attendanceService;

async function fetchDataFromPastHour(time = 40) {
  try {
    if (!attendanceService) {
      const { default: AttendanceService } = await import('../../src/attendance/services/attendance-service.js');
      attendanceService = new AttendanceService();
    }

    await connectMSSQL();
    const result = await sql.query`
      SELECT EmpCode, DateTime, DeviceId
      FROM dbo.Punchlogs
      WHERE DateTime >= DATEADD(MINUTE, -${time}, GETDATE())
      ORDER BY DateTime DESC
    `;

    return result.recordset;
  } catch (error) {
    console.error('Error fetching data:', error);
    throw error;
  }
}

const THRESHOLD_MS = 2 * 60 * 1000; 

function mergePunches(punchRecords) {
  // Group records by EmpCode
  const grouped = {};
  punchRecords.forEach(record => {
    if (!grouped[record.EmpCode]) {
      grouped[record.EmpCode] = [];
    }
    grouped[record.EmpCode].push(record);
  });

  const merged = [];
  for (const empCode in grouped) {
    const employeeRecords = grouped[empCode];
    // Sort records for the employee by DateTime (ascending)
    employeeRecords.sort((a, b) => new Date(a.DateTime) - new Date(b.DateTime));
    
    let current = employeeRecords[0];
    for (let i = 1; i < employeeRecords.length; i++) {
      const record = employeeRecords[i];
      const timeDiff = new Date(record.DateTime) - new Date(current.DateTime);
      
      if (timeDiff <= THRESHOLD_MS) {
        current = record; // Keep the latest punch within the threshold
      } else {
        merged.push(current);
        current = record;
      }
    }
    merged.push(current); 
  }

  merged.sort((a, b) => new Date(b.DateTime) - new Date(a.DateTime));
  return merged;
}

const runFetchUserAttendanceJob = () => {
  cron.schedule('*/5 * * * *', async () => {
    console.log('Running fetch-user-attendance job...');

    try {
      if (!attendanceService) {
        const { default: AttendanceService } = await import('../../src/attendance/services/attendance-service.js');
        attendanceService = new AttendanceService();
      }
      const data = await fetchDataFromPastHour();
      // const data = [
      //   {
      //     EmpCode: 'WIBRO0065',
      //     DateTime: '2025-03-06T10:03:02.000Z',
      //     DeviceId: 'DELHI'
      //   },
      //   {
      //     EmpCode: 'WIBRO0065',
      //     DateTime: '2025-03-06T10:03:10.000Z',
      //     DeviceId: 'DELHI'
      //   },
      //   {
      //     EmpCode: 'WIBRO0065',
      //     DateTime: '2025-03-06T10:03:20.000Z',
      //     DeviceId: 'DELHI'
      //   },
      //   {
      //     EmpCode: 'WIBRO0065',
      //     DateTime: '2025-03-06T10:04:40.000Z',
      //     DeviceId: 'DELHI'
      //   },
      // ];

      if(data.length === 0){
        console.log('No new attendance data found');
        process.exit(0);
      }

      const mergedAttendance = mergePunches(data);

      console.log('Merged attendance:', mergedAttendance);

      const processedData = await attendanceService.processRawData(mergedAttendance);

      await attendanceService.processShiftType(processedData);
    } catch (error) {
      console.error('Error in fetch-user-attendance job:', error);
    }
  });
};

export { runFetchUserAttendanceJob, fetchDataFromPastHour, mergePunches };