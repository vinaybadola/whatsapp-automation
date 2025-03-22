import ActivityLog from "../../attendance/models/activity-logs-model.js";
import EmployeeActivityLogs from "../../attendance/models/employee-activity-logs-model.js";
class LogService {
    static async logActivity({userName, action, entity, entityId, employeeCode, requestPayload, changes, ipAddress, userAgent, affectedSchema , activityMessage}) {
        await ActivityLog.create({
            userName,
            affectedSchema,
            action,
            entity,
            entityId,
            employeeCode,
            changes,
            requestPayload,
            activityMessage,
            ipAddress,
            userAgent,
            timestamp: new Date(),
        });
    }
    
    static async logEmployeeActivity({ action,employeeCode, remarks, punchTime, deviceId }) {
        try {
            await EmployeeActivityLogs.create({
                employeeCode,
                remarks,
                punchTime,
                deviceId,
                action
            });
        } catch (error) {
            console.error("Error logging employee activity in log-service events :", error);
        }
    }
}

export default LogService;
