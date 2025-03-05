import { paginate, paginateReturn } from '../../../helpers/pagination.js';
import { errorResponseHandler } from '../../../helpers/data-validation.js';
import RawAttendance from "../models/raw-attendance-model.js";

export default class RawAttendanceController {
    
    /**
     * Get all raw attendance data
     * 
     */
    getAllRawAttendanceData = async (req, res) => {
        try {
            const { page,limit,skip } = paginate(req);
            const data = await RawAttendance.find().skip(skip).limit(limit);

            const total = await RawAttendance.countDocuments();
            const pagination = paginateReturn(page, limit, total, data.length);
            return res.status(200).json({ success: true, data, pagination });
        } catch (error) {
            console.error("Error fetching raw attendance data:", error);
            if(error instanceof Error) {
                return errorResponseHandler(error.message, 400, res);
            }
        }
    };

    /**
     * Update a new raw attendance record
     * Only status can be updated and remarks can be added
     * and previous status should be true and dateTime should be less than current dateTime
     */

    updateRawAttendanceData = async (req, res) => {
        try {
            const { status, remarks } = req.body;
            const { empCode } = req.params;
            if (!empCode) {
                return errorResponseHandler("Employee code is required", 400, res);
            }
            if (status === undefined) {
                return errorResponseHandler("Status is required", 400, res);
            }

            const record = await RawAttendance.findOne({ employeeId: empCode, status: true }).sort({ dateTime: -1 });
            if (!record) {
                return errorResponseHandler("No record found to update", 404, res);
            }

            if (record.dateTime > new Date()) {
                return errorResponseHandler("Cannot update future records", 400, res);
            }

            record.status = status;
            record.remarks = remarks;
            await record.save();
            return res.status(200).json({ success: true, message: "Attendance updated successfully", data: record });

        } catch (error) {
            console.error("Error updating raw attendance:", error);
            if(error instanceof Error) {
                return errorResponseHandler(error.message, 400, res);
            }
            return errorResponseHandler("Internal Server Error", 500, res);      
        }
    };
}
