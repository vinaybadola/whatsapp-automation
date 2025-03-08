import cron from 'node-cron';
import { sql, connectMSSQL } from '../../config/mssql-database.js';

let attendanceService;
const THRESHOLD_MS = 2 * 60 * 1000; 

async function fetchDataFromPast(timeValue = 10, timeUnit = "minutes", empCode = null, dateFilter = null, raw = false) {
  try {
    if (!attendanceService) {
      const { default: AttendanceService } = await import('../../src/attendance/services/attendance-service.js');
      attendanceService = new AttendanceService();
    }

    await connectMSSQL();

    let timeCondition = "";
    let dateCondition = "";
    let empCondition = "";

    // 🔹 Time Filter (Minutes or Hours)
    if (timeUnit === "minutes") {
      timeCondition = `DateTime >= DATEADD(MINUTE, -${timeValue}, GETDATE())`;
    } else if (timeUnit === "hours") {
      timeCondition = `DateTime >= DATEADD(HOUR, -${timeValue}, GETDATE())`;
    }

    // 🔹 Date Filter (Today, Yesterday, Custom Date)
    if (dateFilter) {
      if (dateFilter === "today") {
        dateCondition = `AND CAST(DateTime AS DATE) = CAST(GETDATE() AS DATE)`;
      } else if (dateFilter === "yesterday") {
        dateCondition = `AND CAST(DateTime AS DATE) = CAST(DATEADD(DAY, -1, GETDATE()) AS DATE)`;
      } else {
        dateCondition = `AND CAST(DateTime AS DATE) = '${dateFilter}'`; 
      }
    }

    // 🔹 Employee Code Filter
    if (empCode) {
      empCondition = `AND EmpCode = '${empCode}'`;
    }

    // 🔥 **Final Query**
    const query =  
    ` SELECT EmpCode, DateTime, DeviceId FROM dbo.Punchlogs WHERE ${timeCondition} ${dateCondition} ${empCondition} ORDER BY DateTime DESC`;
    
    const result = await sql.query(query);
    if(raw == "true"){
      return result.recordset;
    }
    const mergeData = mergePunches(result.recordset);
    return mergeData;
  } catch (error) {
    console.error('Error fetching data:', error);
    throw error;
  }
}


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
      const data = await fetchDataFromPast();
      // const data = [
      //   // {
      //   //   EmpCode: 'WIBRO0065',
      //   //   DateTime: '2025-03-07T11:03:02.000Z',
      //   //   DeviceId: 'DELHI'
      //   // },
      //   // {
      //   //   EmpCode: 'WIBRO0065',
      //   //   DateTime: '2025-03-07T11:03:10.000Z',
      //   //   DeviceId: 'DELHI'
      //   // },
      //   // {
      //   //   EmpCode: 'WIBRO0065',
      //   //   DateTime: '2025-03-07T11:03:20.000Z',
      //   //   DeviceId: 'DELHI'
      //   // },
      //   // {
      //   //   EmpCode: 'WIBRO0065',
      //   //   DateTime: '2025-03-07T11:04:40.000Z',
      //   //   DeviceId: 'DELHI'
      //   // },
      // ];

      if(data.length === 0){
        console.log('No new attendance data found');
        return "No new attendance data found to process in runFetchUserAttendanceJob function !";
      }
      console.log('Merged attendance:', data);
      const processedData = await attendanceService.processRawData(data);

      await attendanceService.processShiftType(processedData);
    } catch (error) {
      console.error('Error in fetch-user-attendance job:', error);
    }
  });
};

export { runFetchUserAttendanceJob, fetchDataFromPast, mergePunches };