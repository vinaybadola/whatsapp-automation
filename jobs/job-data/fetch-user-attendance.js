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

    console.log('Fetched data from the past hour:', result.recordset);
    return result.recordset;
  } catch (error) {
    console.error('Error fetching data:', error);
    throw error;
  }
}

const THRESHOLD_MS = 2 * 60 * 1000; 

function mergePunches(punchRecords) {
  // Sort the records by DateTime (ascending)
  punchRecords.sort((a, b) => new Date(a.DateTime) - new Date(b.DateTime));
  
  let merged = [];
  let current = punchRecords[0];
  
  for (let i = 1; i < punchRecords.length; i++) {
    const record = punchRecords[i];
    const timeDiff = new Date(record.DateTime) - new Date(current.DateTime);
    
    if (timeDiff <= THRESHOLD_MS) {
      current = record;
    } else {
      merged.push(current);
      current = record;
    }
  }
  
  merged.push(current);
  return merged;
}

const runFetchUserAttendanceJob = () => {
  cron.schedule('*/10 * * * *', async () => {
    console.log('Running fetch-user-attendance job...');

    try {
      if (!attendanceService) {
        const { default: AttendanceService } = await import('../../src/attendance/services/attendance-service.js');
        attendanceService = new AttendanceService();
      }
      const data = await fetchDataFromPastHour();
      //const data = [
        // {
        //   EmpCode: 'WIBRO0065',
        //   DateTime: '2025-03-03T10:03:02.000Z',
        //   DeviceId: 'DELHI'
        // },
        // {
        //   EmpCode: 'WIBRO0065',
        //   DateTime: '2025-03-03T10:03:10.000Z',
        //   DeviceId: 'DELHI'
        // },
        // {
        //   EmpCode: 'WIBRO0065',
        //   DateTime: '2025-03-03T10:03:20.000Z',
        //   DeviceId: 'DELHI'
        // },
        // {
        //   EmpCode: 'WIBRO0065',
        //   DateTime: '2025-03-03T10:04:40.000Z',
        //   DeviceId: 'DELHI'
        // },
      //];

      if(data.length === 0){
        console.log('No new attendance data found');
        process.exit(0);
      }

      const mergedAttendance = mergePunches(data);
      console.log('Merged attendance:', mergedAttendance);

      await attendanceService.processShiftType(mergedAttendance);
    } catch (error) {
      console.error('Error in fetch-user-attendance job:', error);
    }
  });
};

export { runFetchUserAttendanceJob, fetchDataFromPastHour, mergePunches };