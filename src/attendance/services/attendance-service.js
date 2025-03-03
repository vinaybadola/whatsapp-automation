import { shiftRoasterDB } from "../../../config/externalDatabase.js";
import UserAttendance from "../../attendance/models/user-attendance-model.js";
import { determinePunchType, checkPunchOutValidity, checkPunchInValidity } from "../../../helpers/attendance-helper.js";
import Defaulters from "../models/user-defaulters-model.js";
import MessageSendingService from "./message-sending-service.js";
import { fetchDataFromPastHour } from '../../../jobs/job-data/fetch-user-attendance.js';
export default class AttendanceService {
    constructor() {
        this.messageSendingService = new MessageSendingService();
    }

    processAttendanceData = async (attendanceData) => {
        try {
            const processedResults = [];

            for (const record of attendanceData) {
                let shiftTiming = await shiftRoasterDB.collection('shifttimings').findOne({ employeeCode: record.EmpCode });
                shiftTiming = {
                    shiftTime: "10:00 - 19:00",
                    name: "vinay",
                    isTodayOff: false
                }
                if (!shiftTiming) {
                    console.log(`Shift timing not found for employee ${record.EmpCode}`);
                    continue;
                }

                // if same time is already available in the database  then skip the record
                // check for both userPunchInTime and userPunchOutTime
                const sameTimeRecord = await UserAttendance.findOne({
                    employeeCode: record.EmpCode,
                    $or: [
                        { userpunchInTime: new Date(record.DateTime) },
                        { userPunchOutTime: new Date(record.DateTime) }
                    ]
                });

                if (sameTimeRecord) {
                    console.log(`Employee ${record.EmpCode} has already punched at ${record.DateTime}`);
                    continue;
                }

                console.log('recordTime:', record.DateTime);

                const punchTime = new Date(record.DateTime);
                const utcPunchTime = new Date(punchTime.getTime() - (5.5 * 60 * 60 * 1000));

                // Parse shift timings 
                const [shiftStartStr, shiftEndStr] = shiftTiming.shiftTime.split('-').map(s => s.trim());

                const shiftDate = new Date(utcPunchTime).toISOString().split('T')[0];
                const shiftStartTime = new Date(`${shiftDate}T${shiftStartStr}:00.000Z`);
                let shiftEndTime = new Date(`${shiftDate}T${shiftEndStr}:00.000Z`);

                let isNightShift = shiftEndTime < shiftStartTime ? true : false;

                if (shiftEndTime < shiftStartTime) {
                    shiftEndTime.setDate(shiftEndTime.getDate() + 1);
                }
                if (isNightShift) {
                    console.log(`Employee ${record.EmpCode} is night shift employee. We are not processing night shift employees temproraily!.`);
                    continue;
                }

                console.log(`Shift start time: ${shiftStartTime}, Shift end time: ${shiftEndTime}`);


                // if shiftEndTime is less than shiftStartTime then it is night shift employee else it is day shift employee
                console.log(`Is night shift: ${isNightShift}`);

                const punchType = await determinePunchType(punchTime, utcPunchTime, shiftStartTime, shiftEndTime, record.EmpCode, isNightShift);

                const now = new Date();
                const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC +5:30

                const startOfToday = new Date(now.getTime());
                // startOfToday.setUTCHours(0, 0, 0, 0);

                let fifteenHoursPrior = new Date(punchTime);
                fifteenHoursPrior.setHours(punchTime.getHours() - 15);

                let existingAttendance

                if (isNightShift) {
                    // if the employee is night shift then fetch the check the previous day attendance
                    // in which the hasPunchedIn is true and hasPunchedOut is false 
                    existingAttendance = await UserAttendance.findOne({
                        employeeCode: record.EmpCode,
                        userpunchInTime: { $gte: fifteenHoursPrior },
                    }).sort({ createdAt: -1 });
                }
                else if (!isNightShift) {
                    // if the employee is day shift then check for only today's date attendance
                    const shiftDateStr = new Date(utcPunchTime).toISOString().split('T')[0];
                    const shiftDateStart = new Date(shiftDateStr);
                    const shiftDateEnd = new Date(shiftDateStr);
                    shiftDateEnd.setDate(shiftDateEnd.getDate() + 1);

                    existingAttendance = await UserAttendance.findOne({
                        employeeCode: record.EmpCode,
                        userpunchInTime: { $gte: shiftDateStart, $lt: shiftDateEnd }
                    });
                }

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
                            isTodayOff: shiftTiming.isTodayOff,
                            totalHours: 0,
                            isHalfDay: false,
                            hasPunchedIn: true
                        });
                    } else {
                        existingAttendance.userpunchInTime = punchTime;
                    }

                    const gracePeriod = 30 * 60 * 1000;  // 30 minutes
                    const allowedPunchInEnd = new Date(shiftStartTime.getTime() + gracePeriod);
                    const { isWithinWindow, isLate, lateBy } = checkPunchInValidity(
                        utcPunchTime,
                        shiftStartTime,
                        gracePeriod,
                        allowedPunchInEnd
                    );

                    if (utcPunchTime - shiftStartTime >= 4 * 60 * 60 * 1000) {    // if punch in is more than 4 hours after shift start time then it is a half day
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
                            isValidPunch: false,
                            hasPunchedOut: true
                        });
                    }
                    else {
                        existingAttendance.userPunchOutTime = punchTime;
                        existingAttendance.hasPunchedOut = true;

                        if (!existingAttendance.isValidPunch && !existingAttendance.hasPunchedIn) {
                            existingAttendance.userpunchInTime = punchTime;
                            existingAttendance.totalHours = "0 hours 0 minutes";
                        }
                        else {
                            let workedHours;
                            console.log('existingAttendance.userpunchInTime:', existingAttendance.userpunchInTime);
                            console.log('utcPunchTime:', utcPunchTime);

                            const millisecondsWorked = Math.max(0, punchTime - existingAttendance.userpunchInTime);
                            const totalMinutes = Math.floor(millisecondsWorked / (1000 * 60));
                            const countingHours = Math.floor(totalMinutes / 60);
                            console.log('countingHours:', countingHours);
                            const minutes = totalMinutes % 60;
                            workedHours = `${countingHours} hours ${minutes} minutes`;

                            existingAttendance.totalHours = workedHours;
                            existingAttendance.isAbsent = countingHours < 4;

                            if (!existingAttendance.isAbsent && countingHours < 9) {
                                existingAttendance.isHalfDay = true;
                            }

                            existingAttendance.isValidPunch = !!existingAttendance.isValidPunch;
                        }
                        if (existingAttendance.hasPunchedIn && existingAttendance.hasPunchedOut) {
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
                    id: existingAttendance._id,
                    employeeCode: record.EmpCode,
                    DeviceId: record.DeviceId,
                    punchType,
                    employeeLateMinutes,
                    name: shiftTiming.name,
                    time: record.DateTime,
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
        try {
            return res.status(200).json({ success: true, data: await fetchDataFromPastHour() });
        }
        catch (error) {
            console.log(`An error occurred while fetching attendance data: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    processNightShiftEmployee = async (attendanceData) => {
    }

    processDayShiftEmployee = async (data) => {
        try {
            const sameTimeRecord = await UserAttendance.findOne({
                employeeCode: data.employeeCode,
                $or: [
                    { userpunchInTime: new Date(data.punchTime) },
                    { userPunchOutTime: new Date(data.punchTime) }
                ]
            });
            if (sameTimeRecord) {
                console.log(`Employee ${data.employeeCode} has already punched at ${data.punchTime}`);
                return;
            }

            const punchType = await determinePunchType(data.punchTime, data.utcPunchTime, data.shiftStartTime, data.shiftEndTime, data.employeeCode, data.isNightShift);

            const now = new Date();
            const startOfToday = new Date(now.getTime());
            startOfToday.setUTCHours(0, 0, 0, 0);

            const shiftDateStr = new Date(data.utcPunchTime).toISOString().split('T')[0];
            const shiftDateStart = new Date(shiftDateStr);
            const shiftDateEnd = new Date(shiftDateStr);
            shiftDateEnd.setDate(shiftDateEnd.getDate() + 1);

            let existingAttendance = await UserAttendance.findOne({
                employeeCode: data.employeeCode,
                userpunchInTime: { $gte: shiftDateStart, $lt: shiftDateEnd }
            });

            console.log(`Punch type for employee :  ${data.employeeCode}: ${punchType}`);

            let employeeLateMinutes = 0; // These two variables are use to determine if the employee is late or not and halfday to send it for
            let isHalfDayToday = false; // sending message 

            if (punchType === 'punch-in') {
                if (!existingAttendance) {
                    existingAttendance = new UserAttendance({
                        employeeCode: data.employeeCode,
                        actualPunchInTime: data.shiftStartTime,
                        userpunchInTime: data.punchTime,
                        deviceId: data.deviceId,
                        actualPunchOutTime: data.shiftEndTime,
                        userPunchOutTime: data.punchTime,
                        isTodayOff: data.isTodayOff,
                        totalHours: 0,
                        isHalfDay: false,
                        hasPunchedIn: true
                    });
                } else {
                    existingAttendance.userpunchInTime = punchTime;
                }

                const gracePeriod = 30 * 60 * 1000;
                const allowedPunchInEnd = new Date(data.shiftStartTime.getTime() + gracePeriod);
                const { isWithinWindow, isLate, lateBy } = checkPunchInValidity(
                    data.punchTime,
                    data.shiftStartTime,
                    gracePeriod,
                    allowedPunchInEnd
                );

                if (data.punchTime - data.shiftStartTime >= 4 * 60 * 60 * 1000) {    // if punch in is more than 4 hours after shift start time then it is a half day
                    existingAttendance.isHalfDay = true;
                    isHalfDayToday = true;
                }

                if (!isWithinWindow) {
                    employeeLateMinutes = lateBy;
                    await Defaulters.updateOne(
                        { employeeCode: data.employeeCode, date: startOfToday },
                        {
                            $set: {
                                employeeCode: data.employeeCode,
                                punchInTime: data.punchTime,
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
                        employeeCode: data.employeeCode,
                        actualPunchInTime: data.shiftStartTime,
                        userpunchInTime: data.punchTime,
                        deviceId: data.deviceId,
                        actualPunchOutTime: data.shiftEndTime,
                        userPunchOutTime: data.punchTime,
                        totalHours: "0 hours 0 minutes",
                        isHalfDay: false,
                        isValidPunch: false,
                        hasPunchedOut: true
                    });
                }
                else {
                    existingAttendance.userPunchOutTime = data.punchTime;
                    existingAttendance.hasPunchedOut = true;

                    let workedHours;
                    if (!existingAttendance.isValidPunch && !existingAttendance.hasPunchedIn) {
                        existingAttendance.userpunchInTime = data.punchTime;
                        existingAttendance.totalHours = "0 hours 0 minutes";
                    }
                    else {
                        console.log('existingAttendance.userpunchInTime:', existingAttendance.userpunchInTime);
                        console.log('utcPunchTime:', data.utcPunchTime);

                        const millisecondsWorked = Math.max(0, data.punchTime - existingAttendance.userpunchInTime);
                        const totalMinutes = Math.floor(millisecondsWorked / (1000 * 60));
                        const countingHours = Math.floor(totalMinutes / 60);
                        const minutes = totalMinutes % 60;
                        workedHours = `${countingHours} hours ${minutes} minutes`;

                        existingAttendance.totalHours = workedHours;
                        existingAttendance.isAbsent = countingHours < 4;

                        if (!existingAttendance.isAbsent && countingHours < 9) {
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
                        if (existingDefaulter) {
                            await Defaulters.updateOne(
                                { employeeCode: data.employeeCode, date: startOfToday },
                                {
                                    $set: {
                                        punchOutTime: data.punchTime,
                                        earlyBy,
                                        isLeavingEarly: true
                                    }
                                }
                            );
                        } else {
                            await Defaulters.create({
                                employeeCode: data.employeeCode,
                                date: startOfToday,
                                punchOutTime: data.punchTime,
                                earlyBy,
                                isLeavingEarly: true
                            });
                        }
                    } else {
                        if (existingDefaulter) {
                            await Defaulters.updateOne(
                                { employeeCode: data.employeeCode, date: startOfToday },
                                {
                                    $set: {
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
            console.log(`An error occurred while processing attendance data: ${error.message}`);
            throw error;
        }

    }

    processShiftType = async (attendanceData) => {
        const processedResults = [];

        for (const record of attendanceData) {
            let shiftTiming = await this.getShiftType(record.EmpCode);
            if (!shiftTiming) {
                console.log(`Shift timing not found for employee ${record.EmpCode}`);
                continue;
            }
            const punchTime = new Date(record.DateTime);
            const utcPunchTime = new Date(punchTime.getTime() - (5.5 * 60 * 60 * 1000));
            const [shiftStartStr, shiftEndStr] = shiftTiming.shiftTime.split('-').map(s => s.trim());

            const shiftDate = new Date(utcPunchTime).toISOString().split('T')[0];
            const shiftStartTime = new Date(`${shiftDate}T${shiftStartStr}:00.000Z`);

            let shiftEndTime = new Date(`${shiftDate}T${shiftEndStr}:00.000Z`);
            let isNightShift = shiftEndTime < shiftStartTime ? true : false;

            processedResults.push({
                punchTime,
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
        console.log(`Processing ${processedResults.length} employees...`);
        for (const record of processedResults) {
            console.log(`Processing ${record.employeeCode} at ${record.punchTime}`);
            if (record.isNightShift) {
                console.log(`${record.employeeCode} is a night shift employee, skipping.`);
                continue;
                // this.processNightShiftEmployee(record);
            }
            else {
                try {
                    await this.processDayShiftEmployee(record);
                } catch (error) {
                    console.log(`Error processing ${record.employeeCode}: ${error.message}`);
                }           
            }
        }
    }

    defaulterEmployeeProcess = async (record) => {
    }
}