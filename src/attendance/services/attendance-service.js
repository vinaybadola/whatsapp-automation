import connectExternalMongo from "../../../config/externalDatabase.js";
import UserAttendance from "../../attendance/models/user-attendance-model.js";
import {parseShiftTime,determinePunchType,checkPunchOutValidity,calculateAllowedWindow,checkPunchInValidity} from "../../../helpers/attendance-helper.js";

export default class AttendanceService{

    processAttendanceData = async (data) => {
    try{
        let data = [
            {
              EmpCode: 'GTEL003',
              DateTime: '2025-01-25T14:11:42.000Z',
              DeviceId: 'DELHI'
            }
          ]
        const externalMongoConnection = await connectExternalMongo();
        const shiftTimingsCollection = externalMongoConnection.collection('shiftTimings');

        for(data of result){
            const shiftDetails = await shiftTimingsCollection.findOne({employeeCode: EmpCode, date : new Date(result.DateTime)}, {projection: {_id: 0, name : 0}});
            const shiftTime = parseShiftTime(shiftDetails.shiftTime, new Date(result.DateTime));

            





        }

    }
    catch(error){
        console.log(`An error occurred while processing attendance data: ${error.message}`);
        if(error instanceof Error){
            return res.status(400).json({ success: false, error: error.message });
        }
        return res.status(500).json({success:false, error : `An error occurred while processing attendance data: ${error.message}`});
    }

};
}
