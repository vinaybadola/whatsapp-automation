import connectExternalMongo from "../../../config/externalDatabase.js";
import UserAttendance from "../../attendance/models/user-attendance-model.js";
import {parseShiftTime,determinePunchType,checkPunchOutValidity,calculateAllowedWindow,checkPunchInValidity} from "../../../helpers/attendance-helper.js";

export default class AttendanceService{

    processAttendanceData = async (data) => {
        try {

            let data = [
                {
                    EmpCode: 'HIWBRO0065',
                    DateTime: '2025-02-06T14:11:42.000Z',
                    DeviceId: 'DELHI'
                }
            ]
                
            const externalMongoConnection = await connectExternalMongo();
            const shiftTimingsCollection = externalMongoConnection.collection('shiftTimings');

            const shiftTiming = await shiftTimingsCollection.findOne({ EmpCode: data.EmpCode });
            if (!shiftTiming) {
                throw new Error('Shift timing not found for the employee');
            }


            const [shiftStart, shiftEnd] = shiftTiming.shiftTime.split('-');
            const shiftStartTime = new Date(`1970-01-01T${shiftStart}:00`);
            const shiftEndTime = new Date(`1970-01-01T${shiftEnd}:00`);

            const gracePeriod = 30 * 60 * 1000; // 30 minutes in milliseconds
            const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds

            const punchTime = new Date(data.DateTime);
            const punchTimeOnly = new Date(`1970-01-01T${punchTime.toTimeString().split(' ')[0]}`);

            // Check if the punch time is within the grace period
            const isWithinGracePeriod = (punchTimeOnly - shiftStartTime) <= gracePeriod && (punchTimeOnly - shiftStartTime) >= -gracePeriod;

            if (!isWithinGracePeriod) {
                throw new Error('Punch time is outside the allowed grace period');
            }

            // Fetch the latest attendance record for the employee
            const latestAttendance = await UserAttendance.findOne({ EmpCode: data.EmpCode }).sort({ DateTime: -1 });

            if (latestAttendance) {
                const lastPunchTime = new Date(latestAttendance.DateTime);
                const timeDifference = punchTime - lastPunchTime;

                if (timeDifference < oneHour) {
                    // If the user punches in again within one hour, ignore the second punch
                    return;
                } else {
                    // If the user punches in after one hour, mark the previous punch as punch out
                    latestAttendance.ActualPunchOutTime = lastPunchTime;
                    latestAttendance.UserPunchOutTime = lastPunchTime;
                    await latestAttendance.save();
                }
            }

            // Create a new attendance record for the current punch
            const newAttendance = new UserAttendance({
                EmpCode: data.EmpCode,
                DateTime: punchTime,
                ActualPunchInTime: punchTime,
                UserpunchInTime: punchTime,
                DeviceId: data.DeviceId,
                isLate: punchTimeOnly > shiftStartTime,
                lateBy: punchTimeOnly > shiftStartTime ? (punchTimeOnly - shiftStartTime) / (1000 * 60) : 0,
                isLeavingEarly: punchTimeOnly < shiftEndTime,
                earlyBy: punchTimeOnly < shiftEndTime ? (shiftEndTime - punchTimeOnly) / (1000 * 60) : 0,
            });

            await newAttendance.save();

            return { success: true, message: 'Attendance data processed successfully' };
        } catch (error) {
            console.log(`An error occurred while processing attendance data: ${error.message}`);
            if (error instanceof Error) {
                return { success: false, error: error.message };
            }
            return { success: false, error: `An error occurred while processing attendance data: ${error.message}` };
        }
    };

}
