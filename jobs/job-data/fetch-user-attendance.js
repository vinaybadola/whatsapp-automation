import cron from 'node-cron';
import { sql } from '../../config/mssql-database.js';
import {processAttendanceData} from '../services/attendance-service';

let isPrevJobRunning = false;

async function fetchDataFromPastHour() {
  try {
    if (isPrevJobRunning) {
      console.log('Previous job is still running...');
      return;
    }
    isPrevJobRunning = true;

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

export default runFetchUserAttendanceJob = () => {
  cron.schedule('*/1 * * * *', async () => {
    console.log('Running fetch-user-attendance job...');
    try {
      const data = await fetchDataFromPastHour();
      await processAttendanceData(data);
    } catch (error) {
      console.error('Error in fetch-user-attendance job:', error);
    }
  });
};

