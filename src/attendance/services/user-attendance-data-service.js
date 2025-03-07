import Defaulters from "../models/user-defaulters-model.js";
import { errorResponseHandler } from '../../../helpers/data-validation.js';
import UserAttendance from "../models/user-attendance-model.js";

export default class UserAttendanceDataService {
    
    getUserStats = async (employeeCode, filterType = "week") => {
        try {
            if (!employeeCode) {
                return errorResponseHandler("Employee code is required", 400);
            }

            const { startDate, daysInRange } = this.getDateRange(filterType);
            const attendanceRecords = await UserAttendance.find({ employeeCode, updatedAt: { $gte: startDate } }).lean();
            const defaulterRecords = await Defaulters.find({ employeeCode, updatedAt: { $gte: startDate } }).lean();

            if (!attendanceRecords.length && !defaulterRecords.length) {
                return { avgWorkingHours: 0, onTimePercentage: 0, daysPresent: 0, daysAbsent: daysInRange };
            }

            const avgWorkingHours = this.calculateAvgWorkingHours(attendanceRecords, defaulterRecords);
            const onTimePercentage = this.calculateOnTimePercentage(defaulterRecords); 
            const {daysPresent, daysAbsent} = this.calculateDaysPresentAndAbsent(attendanceRecords);

            return { avgWorkingHours, onTimePercentage, daysPresent, daysAbsent };

        } catch (error) {
            console.error('Error fetching user stats:', error);
            return errorResponseHandler(error.message, 500);
        }
    };
    getDateRange(filterType) {
        const today = new Date();
        let startDate, daysInRange;

        switch (filterType) {
            case "week":
                startDate = new Date(today.setDate(today.getDate() - 7));
                daysInRange = 7;
                break;
            case "month":
                startDate = new Date(today.setDate(today.getDate() - 30));
                daysInRange = 30;
                break;
            case "year":
                startDate = new Date(today.setFullYear(today.getFullYear() - 1));
                daysInRange = 365;
                break;
            default:
                throw new Error("Invalid filter type");
        }
        return { startDate, daysInRange };
    }
    calculateAvgWorkingHours(attendanceRecords, defaulterRecords) {
        let totalWorkingMinutes = 0, totalWorkingDays = 0;
    
        attendanceRecords.forEach(record => {
            if (record.totalHours) {
                const parts = record.totalHours.match(/(\d+)\s*hours?\s*(\d+)?\s*minutes?/);
                const hours = parts ? parseInt(parts[1]) || 0 : 0;
                const minutes = parts && parts[2] ? parseInt(parts[2]) || 0 : 0;
                totalWorkingMinutes += (hours * 60) + minutes;
                totalWorkingDays++;
            }
        });
    
        defaulterRecords.forEach(record => {
            if (record.isLate && record.lateByTime) {
                const parts = record.lateByTime.match(/(\d+)\s*hours?\s*(\d+)?\s*minutes?/);
                const hours = parts ? parseInt(parts[1]) || 0 : 0;
                const minutes = parts && parts[2] ? parseInt(parts[2]) || 0 : 0;
                totalWorkingMinutes += (hours * 60) + minutes;
            }
        });
    
        return totalWorkingDays ? (totalWorkingMinutes / totalWorkingDays / 60).toFixed(2) : 0;
    }
    calculateOnTimePercentage(defaulterRecords) {
        const totalRecords = defaulterRecords.length;
        const onTimeCount = defaulterRecords.filter(record => !record.isLate).length;
        return totalRecords ? ((onTimeCount / totalRecords) * 100).toFixed(2) : 0;
    }
    calculateDaysPresentAndAbsent(attendanceRecords) {
        let daysPresent = 0, daysAbsent = 0;
    
        attendanceRecords.forEach(record => {
            if (!record.isAbsent || (record.totalHours && record.totalHours !== "0")) {
                daysPresent++;  
            } else {
                daysAbsent++;
            }
        });
    
        return { daysPresent, daysAbsent };
    }   
}
