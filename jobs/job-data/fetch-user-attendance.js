import cron from 'node-cron';
import { sql , connectMSSQL} from '../../config/mssql-database.js';
import AttendanceService from '../../src/attendance/services/attendance-service.js';
 const attendanceService = new AttendanceService();

let isPrevJobRunning = false;

async function fetchDataFromPastHour() {
  try {
    if (isPrevJobRunning) {
      console.log('Previous job is still running...');
      return;
    }
    isPrevJobRunning = true;

    await connectMSSQL();
    // Fetch records from the past hour
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
  } finally {
    isPrevJobRunning = false;
  }
}

const runFetchUserAttendanceJob = () => {
  cron.schedule('*/5 * * * *', async () => {
    console.log('Running fetch-user-attendance job...');
    try {
      const data = await fetchDataFromPastHour();
      // const data = [
      //   {
      //     EmpCode: 'WIBRO0065',
      //     DateTime: '2025-02-26T16:58:42.000Z',
      //     DeviceId: 'DELHI'
      //   }
      // ];
       await attendanceService.processAttendanceData(data);
    } catch (error) {
      console.error('Error in fetch-user-attendance job:', error);
    }
  });
};

export { runFetchUserAttendanceJob, fetchDataFromPastHour };
