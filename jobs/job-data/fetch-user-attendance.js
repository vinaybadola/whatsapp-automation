import cron from 'node-cron';
import { sql, connectMSSQL } from '../../config/mssql-database.js';


let attendanceService;

async function fetchDataFromPastHour() {
  try {
    if (!attendanceService) {
      const { default: AttendanceService } = await import('../../src/attendance/services/attendance-service.js');
      attendanceService = new AttendanceService();
    }

    await connectMSSQL();
    const result = await sql.query`
      SELECT EmpCode, DateTime, DeviceId
      FROM dbo.Punchlogs
      WHERE DateTime >= DATEADD(HOUR, -1, GETDATE())
      ORDER BY DateTime DESC
    `;

    console.log('Fetched data from the past hour:', result.recordset);
    return result.recordset;
  } catch (error) {
    console.error('Error fetching data:', error);
    throw error;
  }
}

const runFetchUserAttendanceJob = () => {
  cron.schedule('*/5 * * * *', async () => {
    console.log('Running fetch-user-attendance job...');

    try {
      if (!attendanceService) {
        const { default: AttendanceService } = await import('../../src/attendance/services/attendance-service.js');
        attendanceService = new AttendanceService();
      }
      // const data = await fetchDataFromPastHour();
      const data = [
        {
          EmpCode: 'WIBRO0065',
          DateTime: '2025-02-27T16:58:42.000Z',
          DeviceId: 'DELHI'
        }
      ];
      await attendanceService.processAttendanceData(data);
    } catch (error) {
      console.error('Error in fetch-user-attendance job:', error);
    }
  });
};

export { runFetchUserAttendanceJob, fetchDataFromPastHour };