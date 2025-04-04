import UserAttendance from "../models/user-attendance-model.js";
import { paginate, paginateReturn } from '../../../helpers/pagination.js';
import { errorResponseHandler } from '../../../helpers/data-validation.js';
import UserAttendanceDataService from "../services/user-attendance-data-service.js";
import { shiftRoasterDB } from "../../../config/externalDatabase.js";
import { ISODateChanger, validateDate, calculateTotalHours, calculateIsLateOrEarly, updateDefaulters } from "../../../helpers/attendance-updation-helper.js";
import eventHandler from "../../events/event-handler.js"
export default class UserAttendanceController {
    constructor() {
        this.userAttendanceDataService = new UserAttendanceDataService();
    }
    /**
     * Get user attendance based on different time ranges (day, week, month, year, custom)
     */
    getUserAttendanceData = async (req, res) => {
        try {
            const { employeeCode, filterType = "day", startDate, endDate, status = "true" } = req.query;

            if (!employeeCode) {
                return errorResponseHandler("Employee code is required", 400, res);
            }

            let filter = { employeeCode };
            const today = new Date();

            switch (filterType) {
                case "day":
                    filter.userpunchInTime = {
                        $gte: new Date(today.setHours(0, 0, 0, 0)),
                        $lt: new Date(today.setHours(23, 59, 59, 999))
                    };
                    break;

                case "date": // ✅ Fixed `date` issue
                    if (!startDate) {
                        return errorResponseHandler("Start date is required for date filter", 400, res);
                    }
                    const specificDate = new Date(startDate);
                    filter.userpunchInTime = {
                        $gte: new Date(specificDate.setHours(0, 0, 0, 0)),
                        $lt: new Date(specificDate.setHours(23, 59, 59, 999))
                    };
                    break;

                case "week": // ✅ Fixed week calculation
                    const startOfWeek = new Date(today);
                    startOfWeek.setDate(today.getDate() - today.getDay());

                    const endOfWeek = new Date(startOfWeek);
                    endOfWeek.setDate(startOfWeek.getDate() + 6);
                    endOfWeek.setHours(23, 59, 59, 999);

                    filter.userpunchInTime = { $gte: startOfWeek, $lt: endOfWeek };
                    break;

                case "month":
                    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                    endOfMonth.setHours(23, 59, 59, 999);

                    filter.userpunchInTime = { $gte: startOfMonth, $lt: endOfMonth };
                    break;

                case "year":
                    const startOfYear = new Date(today.getFullYear(), 0, 1);
                    const endOfYear = new Date(today.getFullYear(), 11, 31);
                    endOfYear.setHours(23, 59, 59, 999);

                    filter.userpunchInTime = { $gte: startOfYear, $lt: endOfYear };
                    break;

                case "custom":
                    if (!startDate || !endDate) {
                        return errorResponseHandler("Start and End dates are required for custom range", 400, res);
                    }

                    const startOfDay = new Date(new Date(startDate).toISOString().split("T")[0] + "T00:00:00.000Z");
                    const endOfDay = new Date(new Date(endDate).toISOString().split("T")[0] + "T23:59:59.999Z");

                    filter.$or = [
                        { userpunchInTime: { $gte: startOfDay, $lt: endOfDay } },
                        { userPunchOutTime: { $gte: startOfDay, $lt: endOfDay } }
                    ];
                    break;


                case "last7days":
                    const sevenDaysAgo = new Date(today);
                    sevenDaysAgo.setDate(today.getDate() - 7);
                    sevenDaysAgo.setHours(0, 0, 0, 0);

                    const todayEnd = new Date();
                    todayEnd.setHours(23, 59, 59, 999);

                    filter.userpunchInTime = { $gte: sevenDaysAgo, $lt: todayEnd };
                    break;

                default:
                    return errorResponseHandler("Invalid filter type", 400, res);
            }
            if (status === "false") {
                filter.status = false;
            } else {
                filter.$or = [{ status: true }, { status: { $exists: false } }];
            }

            const attendanceData = await UserAttendance.find(filter).sort({ updatedAt: -1 });
            return res.status(200).json({ success: true, data: attendanceData });

        } catch (error) {
            console.error("Error fetching attendance data:", error);
            return errorResponseHandler(error.message || "Internal Server Error", 500, res);
        }
    };
    /**
     * Update user attendance (Only allowed within last 15 days)
     */
    updateUserAttendanceData = async (req, res) => {
        try {
            const { id } = req.params;
            if (!id) return errorResponseHandler("Attendance ID is required", 400, res);

            let { userpunchInTime, userPunchOutTime, dataManipulatorEmployeeCode, userName, name, personEmployeeCode } = req.body;
            if(!name || !personEmployeeCode) {
                return errorResponseHandler("Employee name and code are required!", 400, res);
            }
            const record = await UserAttendance.findById(id);
            if (!record) return errorResponseHandler("Attendance record not found", 404, res);

            const fifteenDaysAgo = new Date();
            fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

            if (new Date(record.userpunchInTime) < fifteenDaysAgo) {
                return errorResponseHandler("Cannot update attendance older than 15 days", 403, res);
            }

            let updatedFields = {};
            if (userpunchInTime) updatedFields.userpunchInTime = this.adjustTimeToUTC(userpunchInTime);
            if (userPunchOutTime) updatedFields.userPunchOutTime = this.adjustTimeToUTC(userPunchOutTime);

            updatedFields.employeeName = name;
            updatedFields.employeeCode = personEmployeeCode;

            // Recalculate Attendance Data
            const { totalHours, totalHoursString } = calculateTotalHours(
                updatedFields.userpunchInTime || record.userpunchInTime,
                updatedFields.userPunchOutTime || record.userPunchOutTime
            );

            const { isLate, isLateTime, isOnTime, isLeavingEarly, earlyBy } = calculateIsLateOrEarly(
                record.actualPunchInTime,
                updatedFields.userpunchInTime || record.userpunchInTime,
                record.actualPunchOutTime,
                updatedFields.userPunchOutTime || record.userPunchOutTime
            );

            Object.assign(updatedFields, {
                totalHours: totalHoursString,
                isLate,
                isLeavingEarly,
                isOnTime,
                isValidPunch: updatedFields.userpunchInTime !== updatedFields.userPunchOutTime,
                isAbsent: totalHours < 4,
                isHalfDay: totalHours >= 4 && totalHours < 8
            });

            const updatedRecord = await UserAttendance.findOneAndUpdate(
                { _id: id },
                { $set: updatedFields },
                { new: true }
            );

            if (!updatedRecord) {
                return errorResponseHandler("Failed to update attendance", 500, res);
            }

            const defaultersUpdatedData = await updateDefaulters(
                updatedRecord.employeeCode,
                updatedRecord.userpunchInTime,
                isLate,
                isLeavingEarly,
                updatedRecord.userpunchInTime,
                updatedRecord.userPunchOutTime,
                isLateTime,
                earlyBy,
                updatedRecord._id
            ) || { message: "No Defaulter record Updated!" };

            eventHandler.emit("logActivity", {
                userName,
                employeeCode: dataManipulatorEmployeeCode,
                action: "UPDATE",
                entity: "Attendance",
                affectedSchema: "User-Attendance And defaulters Schema",
                entityId: id,
                requestPayload: req.body,
                changes: { updatedRecord, oldRecord : record, defaultersUpdatedData },
                activityMessage: `Attendance Updated for Employee : ${updatedRecord.employeeCode}`,
                ipAddress: req.headers["x-forwarded-for"] || req.socket.remoteAddress,
                userAgent: req.header('user-agent')
            });

            return res.status(200).json({ success: true, message: "Attendance updated successfully", data: updatedRecord });

        } catch (error) {
            console.error("Error updating attendance:", error);
            return errorResponseHandler(error.message || "Internal Server Error", 500, res);
        }
    };
    /**
     * Get all user attendance records (Paginated)
     */
    getAllUserAttendanceData = async (req, res) => {
        try {
            const { page, limit, skip } = paginate(req);

            const query = {};

            if (req.query.hasPunchedIn) {
                query.hasPunchedIn = req.query.hasPunchedIn === "true"; // Convert to Boolean
            }
            if (req.query.hasPunchedOut) {
                query.hasPunchedOut = req.query.hasPunchedOut === "true";
            }
            if (req.query.isValidPunch) {
                query.isValidPunch = req.query.isValidPunch === "true";
            }
            if (req.query.isHalfDay) {
                query.isHalfDay = req.query.isHalfDay === "true";
            }
            if (req.query.isAbsent) {
                query.isAbsent = req.query.isAbsent === "true";
            }
            if (req.query.deviceId) {
                query.deviceId = req.query.deviceId;
            }
            if (req.query.status !== undefined) {
                query.status = req.query.status === "true"; // Convert to Boolean
            } else {
                query.status = true; // Default to true if no status is provided
            }
            // today date data 
            if (req.query.today) {
                const today = new Date();
                query.userpunchInTime = {
                    $gte: new Date(today.setHours(0, 0, 0, 0)).toISOString(),
                    $lt: new Date(today.setHours(23, 59, 59, 999)).toISOString()
                };
            }

            // Custom date range 
            if (req.query.startDate && req.query.endDate) {
                query.userpunchInTime = {
                    $gte: new Date(req.query.startDate).toISOString()
                };
                query.userPunchOutTime = {
                    $lt: new Date(req.query.endDate).toISOString()
                };
            }

            // For Particular employee
            if (req.query.employeeCode) {
                query.employeeCode = req.query.employeeCode;
            }

            // For night shift and day shift for night shift put the isNightShift as true and for day shift put isDayShift as true
            if (req.query.isNightShift) {
                query.isNightShift = req.query.isNightShift === "true";
            }
            if (req.query.isDayShift) {
                query.isDayShift = req.query.isDayShift === "true";
            }

            const attendanceData = await UserAttendance.find(query).skip(skip).limit(limit).sort({ updatedAt: -1 });
            const total = await UserAttendance.countDocuments(query);
            const pagination = paginateReturn(page, limit, total, attendanceData.length);

            return res.status(200).json({ success: true, data: attendanceData, pagination });

        } catch (error) {
            console.error("Error fetching all attendance data:", error);
            if (error instanceof Error) {
                return errorResponseHandler(error.message, 400, res);
            }
            return errorResponseHandler("Internal Server Error", 500, res);
        }
    };
    /**
     * Add a new user attendance record
     */
    addUserAttendanceData = async (req, res) => {
        try {
            let { name, employeeCode, actualPunchInTime, userpunchInTime, actualPunchOutTime, userPunchOutTime, deviceId, isNightShift, isDayShift, userName, dataManipulatorEmployeeCode } = req.body;

            if (!employeeCode || !userpunchInTime || !userPunchOutTime || !deviceId) {
                return errorResponseHandler("Employee code, punch in/out times and device ID are required", 400, res);
            }

            // Adjust times to UTC
            actualPunchInTime = this.adjustTimeToUTC(actualPunchInTime);
            userpunchInTime = this.adjustTimeToUTC(userpunchInTime);
            actualPunchOutTime = this.adjustTimeToUTC(actualPunchOutTime);
            userPunchOutTime = this.adjustTimeToUTC(userPunchOutTime);

            // Check for duplicate attendance within ±5 minutes
            const timeRangeMinutes = 5;
            const userPunchDate = new Date(userpunchInTime);
            const minTime = new Date(userPunchDate.getTime() - timeRangeMinutes * 60000);
            const maxTime = new Date(userPunchDate.getTime() + timeRangeMinutes * 60000);

            const attendanceData = await UserAttendance.findOne({
                employeeCode,
                deviceId,
                userpunchInTime: { $gte: minTime, $lte: maxTime },
                $or: [
                    { status: true },
                    { status: { $exists: false } }
                ]
            });

            if (attendanceData) {
                return errorResponseHandler("Attendance already exists within this time range, try adding 10 minutes more!", 400, res);
            }

            // Recalculate attendance
            const gracePeriod = 30;
            const { totalHours, totalHoursString } = calculateTotalHours(userpunchInTime, userPunchOutTime);
            const { isLate, isLateTime, isOnTime, isLeavingEarly, earlyBy } = calculateIsLateOrEarly(actualPunchInTime, userpunchInTime, actualPunchOutTime, userPunchOutTime, gracePeriod);

            const newAttendance = new UserAttendance({
                employeeName: name,
                employeeCode,
                actualPunchInTime,
                userpunchInTime,
                actualPunchOutTime,
                userPunchOutTime,
                deviceId,
                hasPunchedIn: !!userpunchInTime,
                hasPunchedOut: !!userPunchOutTime,
                isValidPunch: userpunchInTime !== userPunchOutTime,
                totalHours: totalHoursString,
                isLate,
                isLeavingEarly,
                isOnTime,
                isDayShift,
                isNightShift,
                isAbsent: totalHours < 4,
                isHalfDay: totalHours >= 4 && totalHours < 8
            });

            await newAttendance.save();

            const defaultersUpdatedData = await updateDefaulters(
                employeeCode,
                userpunchInTime,
                isLate,
                isLeavingEarly,
                userpunchInTime,
                userPunchOutTime,
                isLateTime,
                earlyBy,
                newAttendance._id
            ) || { message: "No Defaulter record Updated!" };

            eventHandler.emit("logActivity", {
                userName,
                employeeCode: dataManipulatorEmployeeCode,
                action: "CREATE",
                entity: "Attendance",
                affectedSchema: "User-Attendance And defaulters Schema",
                entityId: newAttendance._id,
                changes: { defaultersUpdatedData },
                requestPayload: req.body,
                activityMessage: `Attendance Added for Employee : ${employeeCode}`,
                ipAddress: req.headers["x-forwarded-for"] || req.socket.remoteAddress,
                userAgent: req.header('user-agent')
            });

            return res.status(201).json({ success: true, message: "Attendance added successfully", data: newAttendance });

        } catch (error) {
            return errorResponseHandler(error.message || "Internal Server Error", 500, res);
        }
    };
    /**
     * Get all shift timings with users in 
    */
    getAllEmployeeShiftData = async (req, res) => {
        try {
            const todayDate = new Date().toISOString().split("T")[0];
            const data = await this.getTotalEmployeeCountAccordingtoShift(todayDate);

            return res.json({ success: true, data });
        } catch (error) {
            console.error("Error fetching employees with their shift Timings!:", error);
            if (error instanceof Error) {
                return errorResponseHandler(error.message, 400, res);
            }
            return errorResponseHandler("Internal Server Error", 500, res);
        }
    };

    getDashboardData = async (req, res) => {
        try {
            const { shiftTiming = '10:00-19:00', page = 0, date, filter, empCode } = req.query;
            console.log("Received Shift Timing:", shiftTiming);

            let targetDate = new Date();
            if (date) {
                targetDate = new Date(date);
            }
            const formattedDate = targetDate.toISOString().split("T")[0];

            const shiftTimings = await this.getTotalEmployeeCountAccordingtoShift(formattedDate);
            const getOnlyShiftTimings = shiftTimings.map((shift) => shift.shiftTime);

            const shift = shiftTimings.find((shift) => shift.shiftTime === shiftTiming);
            const employees = shift ? shift.employees : [];
            const totalEmployees = employees.length;

            // Create a query filter based on request
            let attendanceFilter = {
                userpunchInTime: {
                    $gte: new Date(formattedDate + "T00:00:00.000Z"),
                    $lt: new Date(formattedDate + "T23:59:59.999Z")
                }
            };

            if (empCode) {
                attendanceFilter.employeeCode = empCode; // Search by employee code
            }

            const presentEmployees = await UserAttendance.find(attendanceFilter).sort({ updatedAt: -1 });

            let presentEmployeesCount = presentEmployees.length;
            let absentEmployeesCount = totalEmployees - presentEmployeesCount;

            let onTimeEmployeesCount = 0;
            let lateEmployeesCount = 0;
            let userData = [];

            for (const employee of presentEmployees) {
                const employeeData = {
                    empCode: employee.employeeCode,
                    name: employee.employeeName,
                    userPunchInTime: employee.userpunchInTime,
                    userPunchOutTime: employee.userPunchOutTime
                };

                if (employee.isOnTime) {
                    employeeData.onTime = true;
                    onTimeEmployeesCount++;
                } else {
                    employeeData.isLate = true;
                    lateEmployeesCount++;
                }

                userData.push(employeeData);
            }

            // If filter is applied, return only that category
            if (filter === "late") {
                userData = userData.filter(emp => emp.isLate);
            } else if (filter === "onTime") {
                userData = userData.filter(emp => emp.onTime);
            } else if (filter === "absent") {
                userData = []; // Since absent employees are not in attendance records
            }

            // Graph data remains the same
            let startDate = new Date();
            startDate.setDate(startDate.getDate() - page * 10);
            let endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() - 9);

            const last10DaysData = await UserAttendance.aggregate([
                {
                    $match: {
                        userpunchInTime: {
                            $gte: new Date(endDate.toISOString().split("T")[0] + "T00:00:00.000Z"),
                            $lte: new Date(startDate.toISOString().split("T")[0] + "T23:59:59.999Z")
                        }
                    }
                },
                {
                    $group: {
                        _id: { $dateToString: { format: "%Y-%m-%d", date: "$userpunchInTime" } },
                        presentEmployeesCount: { $sum: 1 },
                        onTimeEmployeesCount: { $sum: { $cond: [{ $eq: ["$isOnTime", true] }, 1, 0] } },
                        lateEmployeesCount: { $sum: { $cond: [{ $eq: ["$isOnTime", false] }, 1, 0] } }
                    }
                },
                { $sort: { _id: 1 } }
            ]);

            return res.status(200).json({
                success: true,
                totalEmployees,
                presentEmployeesCount,
                absentEmployeesCount,
                onTimeEmployeesCount,
                lateEmployeesCount,
                getOnlyShiftTimings,
                userData,
                graphData: last10DaysData,
                pagination: {
                    currentPage: parseInt(page),
                    nextPage: parseInt(page) + 1,
                    prevPage: parseInt(page) > 0 ? parseInt(page) - 1 : null
                }
            });

        } catch (error) {
            console.error("Error fetching dashboard data:", error);
            if (error instanceof Error) {
                return errorResponseHandler(error.message, 400, res);
            }
            return errorResponseHandler("Internal Server Error", 500, res);
        }
    };

    getTotalEmployeeCountAccordingtoShift = async (date) => {
        try {
            const shiftTimingCursor = await shiftRoasterDB.collection("shiftnames").find().toArray();
            const shiftTimings = [];

            for (const shift of shiftTimingCursor) {
                const formattedShiftTime = shift.shiftName.replace(/\s/g, "").replace(/-/g, " - ");

                const employees = await shiftRoasterDB.collection("shifttimings").aggregate([
                    {
                        $match: {
                            shiftTime: new RegExp(`^${formattedShiftTime}$`, "i"),
                            date: {
                                $gte: new Date(date + "T00:00:00.000Z"),
                                $lt: new Date(date + "T23:59:59.999Z")
                            }
                        }
                    },
                    {
                        $group: {
                            _id: "$employeeCode",
                            name: { $first: "$name" },
                            shiftTime: { $first: "$shiftTime" }
                        }
                    }
                ]).toArray();

                shiftTimings.push({
                    shiftTime: shift.shiftName,
                    employees
                });

            }

            return shiftTimings;
        } catch (error) {
            console.error("Error fetching shift timings:", error);
            throw error;
        }
    };

    getUserAttendanceById = async (req, res) => {
        try {
            const { id, filterType = "week" } = req.params;
            if (!id) {
                return errorResponseHandler("Attendance ID is required", 400, res);
            }
            const attendanceData = await UserAttendance.findById(id);
            if (!attendanceData) {
                return errorResponseHandler("Attendance record not found", 404, res);
            }

            const employeeCode = attendanceData.employeeCode;
            const stats = await this.userAttendanceDataService.getUserStats(employeeCode, filterType);

            return res.status(200).json({ success: true, data: attendanceData, stats });
        }
        catch (error) {
            console.error("Error fetching attendance data:", error);
            if (error instanceof Error) {
                return errorResponseHandler(error.message, 400, res);
            }
            return errorResponseHandler("Internal Server Error", 500, res);
        }
    }

    getUserAttendanceHistory = async (req, res) => {
        try {
            const { employeeCode } = req.params;
            const { page, limit, skip } = paginate(req);

            if (!employeeCode) {
                return errorResponseHandler("Employee code is required", 400, res);
            }
            const historyData = await UserAttendance.find({ employeeCode }).skip(skip).limit(limit).sort({ updatedAt: -1 });
            const total = await UserAttendance.countDocuments({ employeeCode });
            const pagination = paginateReturn(page, limit, total, historyData.length);

            return res.status(200).json({ success: true, data: historyData, pagination });
        }
        catch (error) {
            console.error("Error fetching history data:", error);
            if (error instanceof Error) {
                return errorResponseHandler(error.message, 400, res);
            }
            return errorResponseHandler("Internal Server Error", 500, res);
        }
    }

    softDeleteAttendance = async (req, res) => {
        try {
            const { id, userName, dataManipulatorEmployeeCode } = req.query;
            if (!id) {
                return errorResponseHandler("Attendance ID is required", 400, res);
            }
            const attendanceData = await UserAttendance.findById(id);
            if (!attendanceData) {
                return errorResponseHandler("Attendance record not found", 404, res);
            }
            attendanceData.status = false;
            await attendanceData.save();

            eventHandler.emit("logActivity", {
                // userId : new mongoose.Types.ObjectId("random-id"), // TODO: Replace with actual user ID
                userName,
                employeeCode: dataManipulatorEmployeeCode,
                action: "DELETE",
                entity: "Attendance",
                changes : {attendanceData},
                affectedSchema: "User-Attendance",
                entityId: id,
                activityMessage: `Attendance Soft Deleted for Employee : ${attendanceData.employeeCode}`,
                ipAddress: req.headers["x-forwarded-for"] || req.socket.remoteAddress,
                userAgent: req.header('user-agent')
            });

            return res.status(200).json({ success: true, message: "Attendance record deleted successfully " });
        }
        catch (error) {
            console.error("Error deleting attendance record:", error);
            if (error instanceof Error) {
                return errorResponseHandler(error.message, 400, res);
            }
            return errorResponseHandler("Internal Server Error", 500, res);
        }
    }

    getTimeZoneOffset = () => {
        const date = new Date();
        return date.getTimezoneOffset();
    };

    adjustTimeToUTC = (localTime) => {
        const offsetMinutes = this.getTimeZoneOffset();
        const date = new Date(localTime);
        date.setMinutes(date.getMinutes() - offsetMinutes); // Subtract the offset
        return date;
    };
}