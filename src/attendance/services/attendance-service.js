import { shiftRoasterDB } from "../../../config/externalDatabase.js";
import UserAttendance from "../../attendance/models/user-attendance-model.js";
import { determinePunchType, checkPunchOutValidity, checkPunchInValidity, checkExistingPunchForDayShift } from "../../../helpers/attendance-helper.js";
import Defaulters from "../models/user-defaulters-model.js";
import MessageSendingService from "./message-sending-service.js";
import { fetchDataFromPast } from '../../../jobs/job-data/fetch-user-attendance.js';
import RawAttendance from "../models/raw-attendance-model.js";
import { log } from '../../../utils/logger.js';
import { errorResponseHandler } from "../../../helpers/data-validation.js";
import eventHandler from "../../events/event-handler.js";
import { paginate, paginateReturn } from '../../../helpers/pagination.js';
import EmployeeActivityLogs from "../models/employee-activity-logs-model.js";
import ActivityLog from "../models/activity-logs-model.js";

const MAX_LATE_FOR_HALF_DAY_MS = 4 * 60 * 60 * 1000;
const GRACE_PERIOD_MS = 30 * 60 * 1000;
const PUNCH_WINDOW_HOURS_MS = 2 * 60 * 60 * 1000;
const HALF_DAY_HOURS = 4;
const FULL_DAY_HOURS= 8;
const TIMEZONE_OFFSET_MS= 5.5 * 60 * 60 * 1000;

export default class AttendanceService {
    constructor() {
        this.messageSendingService = new MessageSendingService();
    }

    getAttendanceData = async (req, res) => {
        try {
            const { timeValue, timeUnit, empCode, dateFilter, raw } = req.query;

            const attendanceData = await fetchDataFromPast(
                timeValue ? parseInt(timeValue) : 30,
                timeUnit || "minutes",
                empCode || null,
                dateFilter || null,
                raw || false
            );

            return res.status(200).json({ success: true, data: attendanceData });
        }
        catch (error) {
            console.log(`An error occurred while fetching attendance data: ${error.message}`);
            return res.status(500).json({ success: false, error: error.message });
        }
    };

    getSameTimeRecord = async (data) => {
        const sameTimeRecord = await UserAttendance.findOne({
            employeeCode: data.employeeCode,
            $or: [
                { userpunchInTime: new Date(data.punchTime) },
                { userPunchOutTime: new Date(data.punchTime) }
            ]
        });
        return sameTimeRecord;
    }

    processNightShiftEmployee = async (data) => {
        try {
            const sameTimeRecord = await this.getSameTimeRecord(data);

            if (sameTimeRecord) {
                console.log(`Night Shift Employee ${data.employeeCode} has already punched at ${data.punchTime} so skipping the record`);
                return;
            }

            const punchType = await determinePunchType(data.punchTime, data.utcPunchTime, data.shiftStartTime, data.shiftEndTime, data.employeeCode, data.isNightShift);
            let existingAttendance;
          
            if(punchType === 'punch-in'){
                // check if the employee has already punched in within the last 2 hours
                existingAttendance = await UserAttendance.findOne({
                    employeeCode: data.employeeCode,
                    $or: [
                        // Case 1: User punched in within the last 2 hours before shift start time (06:00 AM to 07:59 AM for 08:00 AM shift)
                        { 
                            userpunchInTime: { 
                                $gte: new Date(data.shiftStartTime - PUNCH_WINDOW_HOURS_MS), // Greater than or equal to shift start time - 2 hours
                                $lt: new Date(data.shiftStartTime) // Less than shift start time
                            } 
                        },
                
                        // Case 2: User punched in after shift start time (Late arrival case)
                        { 
                            userpunchInTime: { $gte: new Date(data.shiftStartTime) } 
                        }
                    ]
                });
            }
            else if(punchType === 'punch-out'){
                // check if the employee has already punched out within the last 2 hours or has status of isShiftCompleted between 
                // shift start time and shift end time.

                const time = new Date().getTime()+(TIMEZONE_OFFSET_MS);
                const currentTime = new Date(time).toISOString();

                existingAttendance =await UserAttendance.findOne({
                    employeeCode: data.employeeCode,
                    $or: [
                      // Not punched out yet tries to punch out early (checking if current time is less than actual punch out time)
                      { actualPunchOutTime: { $gt: currentTime } },
                      
                      // Punched out but within grace period of 30 minutes if not found this will create a new record 
                      {
                        actualPunchOutTime: {
                            $lte: currentTime,
                            $gte: new Date(new Date(currentTime).getTime() - GRACE_PERIOD_MS)
                        }
                    }
                    ],
                  });
                if(existingAttendance?.isShiftCompleted === true){
                    eventHandler.emit("employeeActivity", {
                    employeeCode: data.employeeCode,
                    punchTime: data.punchTime,
                    remarks: `Night shift Employee ${data.employeeCode} already punch out at ${existingAttendance.userPunchOutTime} so this record will be stored in raw punches.`,
                    deviceId: data.deviceId,
                    action: "PUNCHOUT"
                 });
                 return `Employee ${data.employeeCode} Shift Already completed at ${existingAttendance.userPunchOutTime}`;
                }
            }
            else{
                log.info(`Employee ${data.employeeCode} has an invalid punch at ${data.punchTime}`);
                return "Invalid Punch Type";
            }
            
            log.info(`Punch type for employee :  ${data.employeeCode}: ${punchType}`);

            let employeeLateMinutes = 0; // These two variables are use to determine if the employee is late or not and halfday to send it for
            let isHalfDayToday = false; // sending message 

            if (punchType === 'punch-in') {
                if (!existingAttendance) {
                    existingAttendance = new UserAttendance({
                        employeeName: data?.employeeName,
                        employeeCode: data.employeeCode,
                        actualPunchInTime: data.shiftStartTime,
                        userpunchInTime: data.punchTime,
                        deviceId: data.deviceId,
                        actualPunchOutTime: data.shiftEndTime,
                        userPunchOutTime: data.punchTime,
                        isTodayOff: data.isTodayOff,
                        totalHours: "0 hours 0 minutes",
                        isHalfDay: false,
                        hasPunchedIn: true,
                        isNightShift: true,
                        isDayShift: false,
                    });
                } else {
                    existingAttendance.userpunchInTime = data.punchTime;
                }

                const { isWithinWindow, lateBy } = checkPunchInValidity(
                    data.punchTime,
                    data.shiftStartTime,
                    GRACE_PERIOD_MS,
                );

                if (data.punchTime - data.shiftStartTime >= MAX_LATE_FOR_HALF_DAY_MS) {    // if punch in is more than 4 hours after shift start time then it is a half day
                    existingAttendance.isHalfDay = true;
                    isHalfDayToday = true;
                }

                if (!isWithinWindow) {
                    employeeLateMinutes = lateBy;
                    existingAttendance.isOnTime = false;
                    
                    await this.handleDefaulterUpdate(
                        data.employeeCode,  
                        {punchInTime: { 
                            $gte: new Date(data.shiftStartTime),
                            $lt: new Date(data.shiftEndTime)
                        }},
                        {
                            date : new Date(data.punchTime),
                            employeeCode: data.employeeCode,
                            punchInTime: new Date(data.punchTime),
                            isLate: true,
                            lateByTime: lateBy,
                            lateDayCount: 1
                        }
                    )
                }

                await existingAttendance.save();

            }
            else if (punchType === 'punch-out') {
                if (!existingAttendance) {
                    existingAttendance = new UserAttendance({
                        employeeName: data?.employeeName,
                        employeeCode: data.employeeCode,
                        actualPunchInTime: data.shiftStartTime,
                        userpunchInTime: data.punchTime,
                        deviceId: data.deviceId,
                        actualPunchOutTime: data.shiftEndTime,
                        userPunchOutTime: data.punchTime,
                        totalHours: "0 hours 0 minutes",
                        isHalfDay: false,
                        isValidPunch: false,
                        hasPunchedOut: true,
                        isNightShift: true,
                        isDayShift: false,
                        isShiftCompleted : true
                    });
                }
                else {
                    existingAttendance.userPunchOutTime = data.punchTime;
                    existingAttendance.hasPunchedOut = true;
                    existingAttendance.isShiftCompleted = true;

                    let workedHours;
                    if (!existingAttendance.isValidPunch && !existingAttendance.hasPunchedIn) {
                        existingAttendance.userpunchInTime = data.punchTime;
                        existingAttendance.totalHours = "0 hours 0 minutes";
                    }
                    else {
                        const millisecondsWorked = Math.max(0, data.punchTime - existingAttendance.userpunchInTime);
                        const totalMinutes = Math.floor(millisecondsWorked / (1000 * 60));
                        const countingHours = Math.floor(totalMinutes / 60);
                        const minutes = totalMinutes % 60;
                        workedHours = `${countingHours} hours ${minutes} minutes`;

                        existingAttendance.totalHours = workedHours;
                        existingAttendance.isAbsent = countingHours < HALF_DAY_HOURS;

                        if (!existingAttendance.isAbsent && countingHours < FULL_DAY_HOURS) {
                            existingAttendance.isHalfDay = true;
                        }

                        existingAttendance.isValidPunch = !!existingAttendance.isValidPunch;
                    }
                    if (existingAttendance.hasPunchedIn && existingAttendance.hasPunchedOut) {
                        existingAttendance.totalHours = workedHours;
                        existingAttendance.isValidPunch = true;
                    }
                }

                if (existingAttendance.actualPunchOutTime) {
                    const { isLeavingEarly, earlyBy } = checkPunchOutValidity(data.punchTime, existingAttendance.actualPunchOutTime);

                    const existingDefaulter = await Defaulters.findOne({
                        employeeCode: data.employeeCode,
                        punchInTime: { 
                            $gte: data.shiftStartTime, 
                            $lt: data.shiftEndTime 
                        }
                    });

                    if (isLeavingEarly) {
                        existingAttendance.isLeavingEarly = true;
                        if (existingDefaulter) {
                            await Defaulters.updateOne(
                                { employeeCode: data.employeeCode, 
                                    punchInTime: { 
                                        $gte: data.shiftStartTime,
                                        $lt: data.shiftEndTime
                                    }
                                },
                                {
                                    $set: {
                                        date : data.punchTime,
                                        punchOutTime: data.punchTime,
                                        earlyBy,
                                        isLeavingEarly: true
                                    }
                                },
                                { upsert: true }
                            );
                        } else {
                            await Defaulters.create({
                                employeeCode: data.employeeCode,
                                date: data.punchTime,
                                punchOutTime: data.punchTime,
                                earlyBy,
                                isLeavingEarly: true
                            });
                        }
                    }
                    else {
                        existingAttendance.isLeavingEarly = false;
                        if (existingDefaulter) {
                            await Defaulters.updateOne(
                                { employeeCode: data.employeeCode,
                                    punchInTime: { 
                                        $gte: data.shiftStartTime,
                                        $lt: data.shiftEndTime
                                    }
                                },
                                {
                                    $set: {
                                        date : data.punchTime,
                                        punchOutTime: data.punchTime,
                                        isLeavingEarly: false,
                                        earlyBy: 0
                                    }
                                }
                            );
                        }
                    }
                }
                await existingAttendance.save();
            }
            else{
                log.info(`Employee ${data.employeeCode} has an invalid punch at ${data.punchTime}`);
                return "Invalid Punch Type";
            }
            await this.messageSendingService.sendMessage({
                id: existingAttendance._id,
                employeeCode: data.employeeCode,
                DeviceId: data.deviceId,
                punchType,
                employeeLateMinutes,
                name: data.name,
                time: data.punchTime,
                isHalfDayToday
            });
        }
        catch (error) {
            console.log(`An error occurred while processing attendance data for night Employees : ${error.message}`);
            throw error;
        }
    }

    processDayShiftEmployee = async (data) => {
        try {
            const sameTimeRecord = await this.getSameTimeRecord(data);

            if (sameTimeRecord) {
                log.info(`Day Shift Employee ${data.employeeCode} has already punched at ${new Date(data.punchTime).toUTCString} so skipping the record`);
                return;
            }

            const punchType = await determinePunchType(data.punchTime, data.utcPunchTime, data.shiftStartTime, data.shiftEndTime, data.employeeCode, data.isNightShift);

            const now = new Date();
            const startOfToday = new Date(now.getTime());
            startOfToday.setUTCHours(0, 0, 0, 0);

            const shiftDateStr = new Date(data.utcPunchTime).toISOString().split('T')[0]; // Shift start date without time 
            const shiftDateStart = new Date(shiftDateStr);
            const shiftDateEnd = new Date(shiftDateStr);
            shiftDateEnd.setDate(shiftDateEnd.getDate() + 1);

            const allowedPunchTime = new Date(data.shiftStartTime.getTime() - (PUNCH_WINDOW_HOURS_MS));
            const utcPunchTime = new Date(data.punchTime);

            if (utcPunchTime < allowedPunchTime) {
                eventHandler.emit("employeeActivity", {
                    employeeCode: data.employeeCode,
                    punchTime: data.punchTime,
                    remarks: `Employee ${data.employeeCode} attempts to punch in 2 hour prior to their respective shift start time System will store this data in raw punches. Make sure to inform the employee about his punch`,
                    deviceId: data.deviceId,
                    action: "PUNCHOUT"
                });
                return `Employee ${data.employeeCode} attempts to punch in at ${data.punchTime} , stored in Raw punches`;
            }

            let existingAttendance = await checkExistingPunchForDayShift(data.employeeCode, shiftDateStart, shiftDateEnd);

            if (existingAttendance?.isShiftCompleted) {
                eventHandler.emit("employeeActivity", {
                    employeeCode: data.employeeCode,
                    punchTime: data.punchTime,
                    remarks: `Employee ${data.employeeCode} has already punched out for the day 
                    So We'll store the record in raw punches and HR has to manually enter this record.`,
                    deviceId: data.deviceId,
                    action: "PUNCHOUT"
                });
                return `Today's Attendance Already exist for employee and stored in employee activity logs  : ${data.employeeCode}`;
            }

            log.info(`Punch type for employee :  ${data.employeeCode}: ${punchType}`);

            let employeeLateMinutes = 0; // These two variables are use to determine if the employee is late or not and halfday to send it for
            let isHalfDayToday = false; // sending message 

            if (punchType === 'punch-in') {
                if (!existingAttendance) {
                    existingAttendance = new UserAttendance({
                        employeeName: data?.employeeName,
                        employeeCode: data.employeeCode,
                        actualPunchInTime: data.shiftStartTime,
                        userpunchInTime: data.punchTime,
                        deviceId: data.deviceId,
                        actualPunchOutTime: data.shiftEndTime,
                        userPunchOutTime: data.punchTime,
                        isTodayOff: data.isTodayOff,
                        totalHours: "0 hours 0 minutes",
                        isHalfDay: false,
                        hasPunchedIn: true,
                        isNightShift: false,
                        isDayShift: true,
                    });
                } else {
                    existingAttendance.userpunchInTime = punchTime;
                }

                const { isWithinWindow,lateBy } = checkPunchInValidity(
                    data.punchTime,
                    data.shiftStartTime,
                    GRACE_PERIOD_MS,
                );

                if (data.punchTime - data.shiftStartTime >= MAX_LATE_FOR_HALF_DAY_MS) {    // if punch in is more than 4 hours after shift start time then it is a half day
                    existingAttendance.isHalfDay = true;
                    isHalfDayToday = true;
                }

                if (!isWithinWindow) {
                    employeeLateMinutes = lateBy;
                    existingAttendance.isOnTime = false;
                    await Defaulters.updateOne(
                        { employeeCode: data.employeeCode, date: startOfToday },
                        {
                            $set: {
                                employeeCode: data.employeeCode,
                                punchInTime: data.punchTime,
                                isLate: true,
                                lateByTime: lateBy,
                                lateDayCount: 1,
                                userAttendanceId: existingAttendance._id
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
                        employeeName: data?.employeeName,
                        employeeCode: data.employeeCode,
                        actualPunchInTime: data.shiftStartTime,
                        userpunchInTime: data.punchTime,
                        deviceId: data.deviceId,
                        actualPunchOutTime: data.shiftEndTime,
                        userPunchOutTime: data.punchTime,
                        totalHours: "0 hours 0 minutes",
                        isHalfDay: false,
                        isValidPunch: false,
                        hasPunchedOut: true,
                        isNightShift: false,
                        isDayShift: true,
                        isOnTime: false,
                        isShiftCompleted: true
                    });
                }
                else {
                    existingAttendance.userPunchOutTime = data.punchTime;
                    existingAttendance.hasPunchedOut = true;
                    existingAttendance.isShiftCompleted = true;

                    let workedHours;
                    if (!existingAttendance.isValidPunch && !existingAttendance.hasPunchedIn) {
                        existingAttendance.userpunchInTime = data.punchTime;
                        existingAttendance.totalHours = "0 hours 0 minutes";
                    }
                    else {
                        const millisecondsWorked = Math.max(0, data.punchTime - existingAttendance.userpunchInTime);
                        const totalMinutes = Math.floor(millisecondsWorked / (1000 * 60));
                        const countingHours = Math.floor(totalMinutes / 60);
                        const minutes = totalMinutes % 60;
                        workedHours = `${countingHours} hours ${minutes} minutes`;

                        existingAttendance.totalHours = workedHours;
                        existingAttendance.isAbsent = countingHours < HALF_DAY_HOURS;

                        if (!existingAttendance.isAbsent && countingHours < FULL_DAY_HOURS) {
                            existingAttendance.isHalfDay = true;
                        }

                        existingAttendance.isValidPunch = !!existingAttendance.isValidPunch;
                    }
                    if (existingAttendance.hasPunchedIn && existingAttendance.hasPunchedOut) {
                        existingAttendance.totalHours = workedHours;
                        existingAttendance.isValidPunch = true;
                    }
                }

                if (existingAttendance.actualPunchOutTime) {
                    const { isLeavingEarly, earlyBy } = checkPunchOutValidity(data.punchTime, existingAttendance.actualPunchOutTime);

                    const existingDefaulter = await Defaulters.findOne({
                        employeeCode: data.employeeCode,
                        date: { $gte: shiftDateStart, $lt: shiftDateEnd }
                    });

                    if (isLeavingEarly) {
                        existingAttendance.isLeavingEarly = true;
                        if (existingDefaulter) {
                            await Defaulters.updateOne(
                                { employeeCode: data.employeeCode, date: startOfToday },
                                {
                                    $set: {
                                        punchOutTime: data.punchTime,
                                        earlyBy,
                                        isLeavingEarly: true,
                                        userAttendanceId: existingAttendance._id
                                    }
                                }
                            );
                        } else {
                            await Defaulters.create({
                                employeeCode: data.employeeCode,
                                date: startOfToday,
                                punchOutTime: data.punchTime,
                                earlyBy,
                                isLeavingEarly: true,
                                userAttendanceId: existingAttendance._id
                            });
                        }
                    } else {
                        existingAttendance.isLeavingEarly = false;
                        if (existingDefaulter) {
                            await Defaulters.updateOne(
                                { employeeCode: data.employeeCode, date: startOfToday },
                                {
                                    $set: {
                                        punchOutTime: data.punchTime,
                                        isLeavingEarly: false,
                                        earlyBy: 0,
                                        userAttendanceId: existingAttendance._id
                                    }
                                }
                            );
                        }
                    }
                }
                await existingAttendance.save();
            }

            await this.messageSendingService.sendMessage({
                id: existingAttendance._id,
                employeeCode: data.employeeCode,
                DeviceId: data.deviceId,
                punchType,
                employeeLateMinutes,
                name: data.name,
                time: data.punchTime,
                isHalfDayToday
            });
        }
        catch (error) {
            console.log(`An error occurred while processing attendance data for day-shift employees: ${error.message}`);
            throw error;
        }

    }

    processShiftType = async (attendanceData) => {

        if (attendanceData.length === 0 || !attendanceData) {
            console.log('No attendance data found');
            return 'No attendance data found to be processed!';
        }
        const processedResults = [];

        for (const record of attendanceData) {
            let shiftTiming = await this.getShiftType(record.EmpCode);
            if (!shiftTiming) {
                log.info(`Shift timing not found for employee ${record.EmpCode}`);
                console.log(`Shift timing not found for employee ${record.EmpCode}`);
                continue;
            }
            const punchTime = new Date(record.DateTime);
            const utcPunchTime = new Date(punchTime.getTime() - (TIMEZONE_OFFSET_MS));
            const [shiftStartStr, shiftEndStr] = shiftTiming.shiftTime.split('-').map(s => s.trim());

            let shiftDate = new Date(utcPunchTime).toISOString().split('T')[0];
            let shiftStartTime = new Date(`${shiftDate}T${shiftStartStr}:00.000Z`);

            let shiftEndTime = new Date(`${shiftDate}T${shiftEndStr}:00.000Z`);
            let isNightShift = shiftEndTime < shiftStartTime ? true : false;

            if (isNightShift) {
                shiftEndTime.setDate(shiftEndTime.getDate() + 1);
                // find the record that has actualPunchOutTime less than current time or my current time is 30 minutes more than that actualPunchOutTime
                // This is done to find existing record to update and instead of creating the shiftStart time and shiftEnd time using current time
                // we use existing record and put those values in shiftStart and shiftEnd time
                // if such record is found then change the shiftStartTime to the actualPunchInTime of that record and shift EndTime to the actualPunchOutTime of that record.
                const time = new Date().getTime()+(TIMEZONE_OFFSET_MS);
                const currentTime = new Date(time).toISOString();


                const findData = await UserAttendance.findOne({
                    employeeCode: record.EmpCode,
                    $expr: {
                      $or: [
                        // Case 1: Not punched out yet (current time is before punch-out time)
                        { $gt: ["$actualPunchOutTime", currentTime] },
                        
                        // Case 2: Within 30-minute grace period after punch-out
                        { 
                          $and: [
                            { $lte: ["$actualPunchOutTime", currentTime] }, // Already punched out
                            { $gte: [currentTime, { $subtract: ["$actualPunchOutTime", GRACE_PERIOD_MS] }] } // Within grace period
                          ]
                        }
                      ]
                    },
                    isShiftCompleted : false
                });
                if(findData){
                    log.info(`Night shift found for employee ${record.EmpCode} at ${record.DateTime}}`);
                    shiftEndTime = findData.actualPunchOutTime;
                    shiftStartTime = findData.actualPunchInTime;
                }
                else{
                    // If data not found then check if shiftStartTime is 6 hours plus from the current time 
                    // If yes that means employee hasn't punch in and so we have to make shift start time previous one day 
                    // to his actual punch in time and shift end time to his actual punch out time 
                 
                    if(shiftStartTime.getTime() - currentTime.getTime() > 6 * 60 * 60 * 1000 ){
                        shiftStartTime.setDate(shiftStartTime.getDate() - 1);
                        shiftEndTime.setDate(shiftEndTime.getDate() - 1);
                        log.info(`Employee ${record.EmpCode} hasn't punch in yet so we marked them punch out at ${shiftEndTime} and punch in at ${shiftStartTime}`);
                    }

                }
            }
            processedResults.push({
                punchTime,
                employeeName: shiftTiming?.name,
                employeeCode: record.EmpCode,
                isTodayOff: shiftTiming.isTodayOff,
                isNightShift,
                deviceId: record.DeviceId,
                name: shiftTiming.name,
                utcPunchTime,
                shiftStartTime,
                shiftEndTime
            });
        }
        await this.processEmployeeAttendance(processedResults);
    }

    getShiftType = async (employeeCode) => {
        const today = new Date();
        const startOfDay = new Date(today);
        startOfDay.setUTCHours(0, 0, 0, 0);
        const endOfDay = new Date(today);
        endOfDay.setUTCHours(23, 59, 59, 999);
        return await shiftRoasterDB.collection('shifttimings').findOne({ employeeCode, date: { $gte: startOfDay, $lte: endOfDay } });
    }

    processEmployeeAttendance = async (processedResults) => {
        if (processedResults.length === 0) {
            console.log('No attendance data found to be processed!');
            return;
        }
        console.log(`Processing ${processedResults.length} employees...`);

        for (const record of processedResults) {
            log.info(`Processing ${record.employeeCode} at ${record.punchTime}`);
            if (record.isNightShift) {
                try{
                    await this.processNightShiftEmployee(record);
                }
                catch(error){
                    console.log(`Error processing for night shift employee :  ${record.employeeCode}: ${error.message}`);
                }
                continue;
            }
            else {
                try {
                    await this.processDayShiftEmployee(record);
                } catch (error) {
                    console.log(`Error processing for day shift employee :  ${record.employeeCode}: ${error.message}`);
                }
            }
        }
    }

    handleDefaulterUpdate = async (employeeCode, criteria, updateData) => {
        await Defaulters.updateOne(
          { employeeCode, ...criteria },
          { $set: updateData },
          { upsert: true }
        );
    };

    processRawData = async (attendanceData) => {
        try {
            if (!attendanceData || attendanceData.length === 0) {
                console.log("No attendance data received.");
                return;
            }

            // The logic is straightforward: when we receive the raw data, we'll extract the datetime and match it with the userAttendance model.
            // If the userPunchInTime or userPunchOutTime is the same, we'll skip the record. Otherwise, we'll store the record in the rawAttendance model.
            // This will pass to the process Attendance function to process the attendance data.

            const processedResults = [];

            for (const record of attendanceData) {
                const punchTime = new Date(record.DateTime);

                const punchTimeISO = punchTime.toISOString();

                const sameTimeRecord = await UserAttendance.findOne({
                    employeeCode: record.EmpCode,
                    $or: [
                        { userpunchInTime: punchTimeISO },
                        { userPunchOutTime: punchTimeISO }
                    ]
                });
                if (sameTimeRecord) {
                    log.info(`Same Time Record has found during raw processing of Employee ${record.EmpCode} at ${punchTimeISO} so skipping the record`);
                    // we can also set the status false for the record of employeeID and dateTime 
                    // to avoid the duplicate record in the future
                    await RawAttendance.updateOne({ employeeId: record.EmpCode, dateTime: punchTime },
                        { status: false },
                        { upsert: true }
                    );
                    continue;
                }

                await RawAttendance.updateOne(
                    { employeeId: record.EmpCode, dateTime: new Date(record.DateTime) },
                    { $set: { status: true, deviceId: record.DeviceId } },
                    { upsert: true }
                );

                processedResults.push({
                    EmpCode: record.EmpCode,
                    DateTime: record.DateTime,
                    DeviceId: record.DeviceId
                });
            }
            return processedResults;
        }
        catch (error) {
            console.log(`An error occurred while processing raw attendance data: ${error.message}`);
            throw new Error(`An error occurred while processing raw attendance data: ${error.message}`);
        }
    }

    getRawPunches = async (req, res) => {
        try {
            const { empCode, date = new Date().toISOString().split('T')[0] } = req.query;

            if (!empCode) {
                return errorResponseHandler("EmpCode required", 400, res);
            }

            const selectedDate = date ? new Date(date) : new Date();
            if (isNaN(selectedDate.getTime())) {
                return errorResponseHandler("Invalid Date", 400, res);
            }

            const startOfTheDay = new Date(selectedDate);
            startOfTheDay.setUTCHours(0, 0, 0, 0);

            const endOfTheDay = new Date(selectedDate);
            endOfTheDay.setUTCHours(23, 59, 59, 999);

            const findEmployeeRawPunches = await RawAttendance.find({
                employeeId: empCode,
                dateTime: { $gte: startOfTheDay, $lt: endOfTheDay }
            }).sort({ createdAt: -1 });

            if (findEmployeeRawPunches.length < 1) {
                return errorResponseHandler("No Raw Punches found today!", 400, res);
            }

            return res.status(200).json({ success: true, data: findEmployeeRawPunches });
        } catch (error) {
            console.log("An error occurred while fetching raw attendance", error);
            return res.status(error instanceof Error ? 400 : 500).json({
                success: false,
                message: error instanceof Error ? "Validation Error" : "Internal Server Error",
                error: error.message
            });
        }
    };

    getEmployeeActivity = async (req, res) => {
        const { employeeCode } = req.params;
        const { date = new Date().toISOString().split('T')[0] } = req.query;

        try {
            const { page, limit, skip } = paginate(req);

            if (!employeeCode) {
                return errorResponseHandler("Employee code is required", 400, res);
            }

            const selectedDate = new Date(date);
            if (isNaN(selectedDate.getTime())) {
                return errorResponseHandler("Invalid Date", 400, res);
            }

            // Setting Start & End of the Day for Date Filter
            const startOfTheDay = new Date(selectedDate);
            startOfTheDay.setUTCHours(0, 0, 0, 0);

            const endOfTheDay = new Date(selectedDate);
            endOfTheDay.setUTCHours(23, 59, 59, 999);

            // Adding date filter
            const filter = { employeeCode, punchTime: { $gte: startOfTheDay, $lt: endOfTheDay } };

            const totalDocuments = await EmployeeActivityLogs.countDocuments(filter);

            const findEmployeeActivity = await EmployeeActivityLogs.find(filter)
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 });

            const pagination = paginateReturn(page, limit, totalDocuments, findEmployeeActivity.length);

            return res.status(200).json({ success: true, data: findEmployeeActivity, pagination });

        } catch (error) {
            console.log('An error occurred while fetching employee activity', error);
            return res.status(error instanceof Error ? 400 : 500).json({
                success: false,
                message: error instanceof Error ? "Validation Error" : "Internal Server Error",
                error: error.message
            });
        }
    };

    getAllActivityLogs = async (req, res) => {
        try {
            const { page, limit, skip } = paginate(req);
            const { employeeCode, date } = req.query;

            const selectedDate = date ? new Date(date) : new Date();

            if (isNaN(selectedDate.getTime())) {
                return errorResponseHandler("Invalid Date", 400, res);
            }

            let query = {};
            if (date) {
                const startOfDay = new Date(selectedDate.setHours(0, 0, 0, 0));
                const endOfDay = new Date(selectedDate.setHours(23, 59, 59, 999));
                query = { timestamp: { $gte: startOfDay, $lte: endOfDay } };
            }
            console.log('query', query);
            if (employeeCode) {
                query.employeeCode = employeeCode;
            }

            const logs = await ActivityLog.find(query)
                .skip(skip)
                .limit(limit).
                sort({ createdAt: -1 });

            const total = await ActivityLog.countDocuments(query);
            const pagination = paginateReturn(page, limit, total, logs.length);

            return res.status(200).json({ success: true, data: logs, pagination });
        } catch (error) {
            console.error("An error occurred while fetching all employee activity", error);
            return errorResponseHandler(error.message || "Internal Server Error", 500, res);
        }
    };

    getActivityLogById = async(req,res)=>{
        try{
            const {id} = req.params;
            if(!id){
                return errorResponseHandler("Activity Id is required", 400, res);
            }
            const getData = await ActivityLog.findById(id);
            if(getData.length<1){
                return errorResponseHandler("Data not found", 400, res);
            }
            return res.status(200).json({success: true, message: "Logs Fetched Succesfully", data: getData});
        }
        catch(error){
            console.log('An error occurred while fetch activity by Id', error.message);
            if(error instanceof Error){
                return errorResponseHandler(error.message, 400, res);
            }
            return errorResponseHandler("Internal Server Error", 500, res);
        }
    }
}