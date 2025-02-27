import { shiftRoasterDB } from "../../../config/externalDatabase.js";
import UserAttendance from "../../attendance/models/user-attendance-model.js";
import {determinePunchType,checkPunchOutValidity,checkPunchInValidity } from "../../../helpers/attendance-helper.js";
import Defaulters from "../models/user-defaulters-model.js";
import MessageSendingService from "./message-sending-service.js";
import {fetchDataFromPastHour} from '../../../jobs/job-data/fetch-user-attendance.js';
export default class AttendanceService{
    constructor(){
        this.messageSendingService = new MessageSendingService();
    }

    processAttendanceData = async (attendanceData) => {
        try {
            const processedResults = [];

            for (const record of attendanceData) {
                const shiftTiming = await shiftRoasterDB.collection('shifttimings').findOne({ employeeCode: record.EmpCode });

                if (!shiftTiming) {
                    console.log(`Shift timing not found for employee ${record.EmpCode}`);
                    continue;
                }
                
                if (shiftTiming?.offday) { 
                    console.log(`Employee ${record.EmpCode} has a day off`);
                    continue;
                }
                // if same time is already available in the database  then skip the record
                const sameTimeRecord = await UserAttendance.findOne({
                    employeeCode: record.EmpCode,
                    userpunchInTime: record.DateTime
                });

                if(sameTimeRecord){
                    console.log(`Employee ${record.EmpCode} has already punched at ${record.DateTime}`);
                    continue;
                }

                // Parse shift timings 
                const [shiftStartStr, shiftEndStr] = shiftTiming.shiftTime.split('-').map(s => s.trim()); // Trim spaces

                const shiftDate = new Date(record.DateTime).toISOString().split('T')[0]; 

                const shiftStartTime = new Date(`${shiftDate}T${shiftStartStr}:00.000Z`);
                const shiftEndTime = new Date(`${shiftDate}T${shiftEndStr}:00.000Z`);

                // determine punch type based on the time of the day 
                const punchTime = new Date(record.DateTime);
                const punchType = await determinePunchType(punchTime, shiftStartTime, shiftEndTime, record.EmpCode);
    
                const now = new Date();
                const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC +5:30

                const startOfToday = new Date(now.getTime() + istOffset);
                startOfToday.setUTCHours(0, 0, 0, 0);
                    
                const tenHoursPrior = new Date(punchTime);
                tenHoursPrior.setHours(punchTime.getHours() - 10);
    
                let existingAttendance = await UserAttendance.findOne({
                    employeeCode: record.EmpCode,
                    // userpunchInTime: { $gte: tenHoursPrior, $lte: punchTime }
                }).sort({ userpunchInTime: -1 });

                let employeeLateMinutes = 0;
                let isHalfDayToday = false;
                if (punchType === 'punch-in') {
                    if (!existingAttendance) {
                        existingAttendance = new UserAttendance({
                            employeeCode: record.EmpCode,
                            actualPunchInTime: shiftStartTime,
                            userpunchInTime: punchTime,
                            deviceId: record.DeviceId,
                            actualPunchOutTime: shiftEndTime,
                            userPunchOutTime: punchTime,
                            totalHours: 0,
                            isHalfDay: false,
                            hasPunchedIn : true
                        });
                    } else {
                        existingAttendance.userpunchInTime = punchTime;
                    }
    
                    const gracePeriod = 30 * 60 * 1000;  // 30 minutes
                    const allowedPunchInEnd = new Date(shiftStartTime.getTime() + gracePeriod);
                    const { isWithinWindow, isLate, lateBy } = checkPunchInValidity(
                        punchTime,
                        shiftStartTime,
                        gracePeriod,
                        allowedPunchInEnd
                    );
    
                    if (punchTime - shiftStartTime >= 4 * 60 * 60 * 1000) {    // if punch in is more than 4 hours after shift start time then it is a half day
                        isHalfDayToday = true;
                        existingAttendance.isHalfDay = true;
                    }
                    
                    if (!isWithinWindow) {
                        employeeLateMinutes = lateBy;
                        await Defaulters.updateOne(
                            { employeeCode: record.EmpCode, date: startOfToday },
                            {
                                $set: {
                                    employeeCode: record.EmpCode,
                                    punchInTime: punchTime,
                                    isLate: true,
                                    lateByTime: lateBy,
                                    lateDayCount: 1
                                }
                            },
                            { upsert: true }
                        );
                    }
    
                    await existingAttendance.save();
                } 
                else if (punchType === 'punch-out') {
                    if (!existingAttendance) {
                        existingAttendance = new UserAttendance({
                            employeeCode: record.EmpCode,
                            actualPunchInTime: shiftStartTime,
                            userpunchInTime: punchTime,
                            deviceId: record.DeviceId,
                            actualPunchOutTime: shiftEndTime,
                            userPunchOutTime: punchTime,
                            totalHours: "0 hours 0 minutes",
                            isHalfDay: false,
                            isValidPunch : false,
                            hasPunchedOut : true
                        });
                    } 
                    else {
                        existingAttendance.userPunchOutTime = punchTime;
                        existingAttendance.hasPunchedOut = true;
                        
                        if (!existingAttendance.isValidPunch && !existingAttendance.hasPunchedIn) {
                            existingAttendance.userpunchInTime = punchTime;
                            existingAttendance.totalHours = "0 hours 0 minutes"; 
                        }
                        else{
                            let workedHours;
                            const millisecondsWorked = Math.max(0, punchTime - existingAttendance.userpunchInTime);
                            const totalMinutes = Math.floor(millisecondsWorked / (1000 * 60)); 
                            const countingHours = Math.floor(totalMinutes / 60);
                            const minutes = totalMinutes % 60;
                            workedHours = `${countingHours} hours ${minutes} minutes`;
                            
                            existingAttendance.totalHours = workedHours;
                            existingAttendance.isAbsent = countingHours < 4;

                            if(!existingAttendance.isAbsent && countingHours <= 9) {
                                existingAttendance.isHalfDay = true;
                            }

                            existingAttendance.isValidPunch = !!existingAttendance.isValidPunch; 
                        }
                        if(existingAttendance.hasPunchedIn && existingAttendance.hasPunchedOut){
                            existingAttendance.isValidPunch = true;
                        }
                    }

                    if (existingAttendance.actualPunchOutTime) {
                        const { isLeavingEarly, earlyBy } = checkPunchOutValidity(punchTime, existingAttendance.actualPunchOutTime);
                        
                        const existingDefaulter = await Defaulters.findOne({
                            employeeCode: record.EmpCode,
                            date: startOfToday
                        });
                    
                        if (isLeavingEarly) {
                            if (existingDefaulter) {
                                await Defaulters.updateOne(
                                    { employeeCode: record.EmpCode, date: startOfToday },
                                    {
                                        $set: {
                                            punchOutTime: punchTime, 
                                            earlyBy,
                                            isLeavingEarly: true
                                        }
                                    }
                                );
                            } else {
                                await Defaulters.create({
                                    employeeCode: record.EmpCode,
                                    date: startOfToday,
                                    punchOutTime: punchTime,
                                    earlyBy,
                                    isLeavingEarly: true
                                });
                            }
                        } else {
                            if (existingDefaulter) {
                                await Defaulters.updateOne(
                                    { employeeCode: record.EmpCode, date: startOfToday },
                                    {
                                        $set: {
                                            punchOutTime: punchTime,
                                            isLeavingEarly: false,
                                            earlyBy: 0
                                        }
                                    }
                                );
                            } 
                            // else {
                            //     await Defaulters.create({
                            //         employeeCode: record.EmpCode,
                            //         date: startOfToday,
                            //         punchOutTime: punchTime,
                            //         isLeavingEarly: false,
                            //         earlyBy: 0
                            //     });
                            // }
                        }
                    }
                    
                    await existingAttendance.save();
                }
                processedResults.push({
                    id : existingAttendance._id,
                    employeeCode: record.EmpCode,
                    DeviceId: record.DeviceId,
                    punchType,
                    employeeLateMinutes,
                    name : shiftTiming.name,
                    time : record.DateTime,
                    isHalfDayToday
                    
                });
            }

            await this.messageSendingService.sendMessage(processedResults);
            return processedResults;

        } catch (error) {
            console.log(`An error occurred while processing attendance data: ${error.message}`);
            return { success: false, error: error.message };
        }
    };  
    
    getAttendanceData = async (req, res) => {
        try{
            return res.status(200).json({ success: true, data: await fetchDataFromPastHour() });
        }
        catch(error){
            console.log(`An error occurred while fetching attendance data: ${error.message}`);
            return { success: false, error: error.message };
        }
    }
}