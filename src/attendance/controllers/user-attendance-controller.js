import UserAttendance from "../models/user-attendance-model.js";
import Defaulters from "../models/user-defaulters-model.js";
import { paginate, paginateReturn } from '../../../helpers/pagination.js';
import { errorResponseHandler } from '../../../helpers/data-validation.js';
import UserAttendanceDataService from "../services/user-attendance-data-service.js";
import { shiftRoasterDB } from "../../../config/externalDatabase.js";

export default class UserAttendanceController {
    constructor(){
        this.userAttendanceDataService = new UserAttendanceDataService();
    }

    /**
     * Get user attendance based on different time ranges (day, week, month, year, custom)
     */
    getUserAttendanceData = async (req, res) => {
        try {
            const { employeeCode, filterType= "day", startDate, endDate } = req.query;

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
                case "week":
                    const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
                    const endOfWeek = new Date(today.setDate(startOfWeek.getDate() + 6));
                    filter.userpunchInTime = { $gte: startOfWeek, $lt: endOfWeek };
                    break;
                case "month":
                    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                    filter.userpunchInTime = { $gte: startOfMonth, $lt: endOfMonth };
                    break;
                case "year":
                    const startOfYear = new Date(today.getFullYear(), 0, 1);
                    const endOfYear = new Date(today.getFullYear(), 11, 31);
                    filter.userpunchInTime = { $gte: startOfYear, $lt: endOfYear };
                    break;
                case "custom":
                    if (!startDate || !endDate) {
                        return errorResponseHandler("Start and End dates are required for custom range", 400, res);
                    }
                    filter.userpunchInTime = { $gte: new Date(startDate), $lt: new Date(endDate) };
                    break;
                default:
                    return errorResponseHandler("Invalid filter type", 400, res);
            }

            const stats = await this.userAttendanceDataService.getUserStats(employeeCode, filterType);
            const attendanceData = await UserAttendance.find(filter).sort({updatedAt: -1});
            return res.status(200).json({ success: true, data: attendanceData, stats });

        } catch (error) {
            console.error("Error fetching attendance data:", error);
            if(error instanceof Error) {
                return errorResponseHandler(error.message, 400, res);
            }
            return errorResponseHandler("Internal Server Error", 500, res);
        }
    };

    /**
     * Update user attendance (Only allowed within last 5 days)
     */
    updateUserAttendanceData = async (req, res) => {
        try {
            const { id } = req.params;
            if (!id) {
                return errorResponseHandler("Attendance ID is required", 400, res);
            }
            const { userPunchInTime, userPunchOutTime } = req.body;

            const record = await UserAttendance.findById(id);
            if (!record) {
                return errorResponseHandler("Attendance record not found", 404, res);
            }

            const fiveDaysAgo = new Date();
            fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

            if (record.userpunchInTime < fiveDaysAgo) {
                return errorResponseHandler("Cannot update attendance older than 5 days", 403, res);
            }

            if (userPunchInTime) record.userpunchInTime = new Date(userPunchInTime);
            if (userPunchOutTime) record.userPunchOutTime = new Date(userPunchOutTime);

            await record.save();
            return res.status(200).json({ success: true, message: "Attendance updated successfully", data: record });

        } catch (error) {
            console.error("Error updating attendance:", error);
            if(error instanceof Error) {
                return errorResponseHandler(error.message, 400, res);
            }
            return errorResponseHandler("Internal Server Error", 500, res);      
        }
    };

    /**
     * Get all user attendance records (Paginated)
     */
    getAllUserAttendanceData = async (req, res) => {
        try {
            const { page,limit,skip } = paginate(req);

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
            if(error instanceof Error) {
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
            const {
                employeeCode,
                actualPunchInTime,
                userpunchInTime,
                actualPunchOutTime,
                userPunchOutTime,
                totalHours,
                deviceId
            } = req.body;

            if (!employeeCode || !userpunchInTime || !userPunchOutTime || !deviceId) {
                return errorResponseHandler("Employee code, punch in/out times and device ID are required", 400, res);
            }

            const newAttendance = new UserAttendance({
                employeeCode,
                actualPunchInTime: new Date(actualPunchInTime),
                userpunchInTime: new Date(userpunchInTime),
                actualPunchOutTime: new Date(actualPunchOutTime),
                userPunchOutTime: new Date(userPunchOutTime),
                totalHours,
                deviceId,
                hasPunchedIn: true,
                hasPunchedOut: true,
                isValidPunch: true
            });

            await newAttendance.save();

            // Check if employee is late and update Defaulters list
            const punchInThreshold = new Date(actualPunchInTime);
            punchInThreshold.setMinutes(punchInThreshold.getMinutes() + 10); 

            if (new Date(userpunchInTime) > punchInThreshold) {
                await Defaulters.updateOne(
                    { employeeCode, date: new Date().setHours(0, 0, 0, 0) },
                    {
                        $set: {
                            isLate: true,
                            punchInTime: userpunchInTime,
                            lateByTime: Math.floor((new Date(userpunchInTime) - punchInThreshold) / 60000) + " minutes"
                        }
                    },
                    { upsert: true }
                );
            }

            return res.status(201).json({ success: true, message: "Attendance added successfully", data: newAttendance });

        } catch (error) {
            console.error("Error adding attendance:", error);
            if(error instanceof Error) {
                return errorResponseHandler(error.message, 400, res);
            }
            return errorResponseHandler("Internal Server Error", 500, res);
        }
    };

    /**
     * Get all shift timings with users in 
    */
    getAllEmployeeShiftData = async (req, res) => {
    try {
        const todayDate = new Date().toISOString().split("T")[0]; 

        const shiftTimingCursor = await shiftRoasterDB.collection("shiftnames").find().toArray();
        console.log("shiftTimingCursor", shiftTimingCursor);
        const shiftTimings = [];

        for (const shift of shiftTimingCursor) {
            const formattedShiftTime = shift.shiftName.replace(/\s/g, ""); 
        
            const employees = await shiftRoasterDB.collection("shifttimings").aggregate([
                { 
                    $match: { 
                        shiftTime: new RegExp("^" + formattedShiftTime.replace(/-/g, " - ") + "$"),
                        date: {
                            $gte: new Date(todayDate + "T00:00:00.000Z"),
                            $lt: new Date(todayDate + "T23:59:59.999Z")
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
        return res.json({ success: true, data : shiftTimings });
    } catch (error) {
        console.error("Error fetching employees with their shift Timings!:", error);
        if( error instanceof Error){
            return errorResponseHandler(error.message, 400,res);
        }
        return errorResponseHandler("Internal Server Error", 500, res);
    }
    };

    /**
     * Get all user absent/present (Paginated)
     */

    getAllUserAbsentPresentData = async (req, res) => {
        try {
            const { page, limit, skip } = paginate(req);
            const query = {};
    
            // 🔹 Filter by Employee Code (If Requested)
            if (req.query.employeeCode) {
                query.employeeCode = req.query.employeeCode;
            }
    
            // 🔹 Filter by Shift Timing (If Requested)
            if (req.query.shiftTime) {
                query.shiftTime = req.query.shiftTime;
            }
    
            // 🔹 Filter by Attendance Status
            if (req.query.isAbsent) {
                query.isAbsent = req.query.isAbsent === "true";
            }
            if (req.query.isPresent) {
                query.isPresent = req.query.isPresent === "true";
            }
    
            // 🔹 Filter by Today's Date
            if (req.query.today === "true") {  // ✅ Compare as string
                const today = new Date();
                query.userpunchInTime = {
                    $gte: new Date(today.setHours(0, 0, 0, 0)),
                    $lt: new Date(today.setHours(23, 59, 59, 999))
                };
            }
    
            // 🔹 Filter by Specific Date
            if (req.query.date) {
                const selectedDate = new Date(req.query.date);
                if (selectedDate.toString() === "Invalid Date") {
                    return errorResponseHandler("Invalid Date Format", 400, res);
                }
                query.userpunchInTime = {
                    $gte: new Date(selectedDate.setHours(0, 0, 0, 0)).toISOString(),
                    $lt: new Date(selectedDate.setHours(23, 59, 59, 999)).toISOString()
                };
            }
    
            // 🔹 Filter by Date Range (Start Date - End Date)
            else if (req.query.startDate && req.query.endDate) {
                query.userpunchInTime = {
                    $gte: new Date(req.query.startDate).toISOString(),
                    $lt: new Date(req.query.endDate).toISOString()
                };
            }
    
            const presentEmployeeCount = await UserAttendance.aggregate([
                { 
                    $match: { 
                        ...query, 
                        hasPunchedIn: true,   
                        hasPunchedOut: true   
                    } 
                },
                { $group: { _id: "$employeeCode" } },
                { $count: "presentCount" }
            ]);
            console.log('query',query);
            
            const absentEmployeeCount = await UserAttendance.aggregate([
                { 
                    $match: { 
                        ...query, 
                        isAbsent: true,
                        hasPunchedIn: false,   
                        hasPunchedOut: false   
                    } 
                },
                { $group: { _id: "$employeeCode" } },
                { $count: "absentCount" }
            ]);
            
            const presentCount = presentEmployeeCount.length > 0 ? presentEmployeeCount[0].presentCount : 0;
            const absentCount = absentEmployeeCount.length > 0 ? absentEmployeeCount[0].absentCount : 0;
            
    
            // 🔹 Fetch Attendance Data
            const attendanceData = await UserAttendance.find(query)
                .skip(skip)
                .limit(limit)
                .sort({ updatedAt: -1 });
    
            const total = await UserAttendance.countDocuments(query);
            const pagination = paginateReturn(page, limit, total, attendanceData.length);
    
            return res.status(200).json({
                success: true,
                data: attendanceData,
                presentEmployeeCount: presentCount,
                absentEmployeeCount: absentCount,
                pagination
            });
    
        } catch (error) {
            console.error("Error fetching attendance data:", error);
            if (error instanceof Error) {
                return errorResponseHandler(error.message, 400, res);
            }
            return errorResponseHandler("Internal Server Error", 500, res);
        }
    };
    

}