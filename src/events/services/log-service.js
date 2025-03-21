import ActivityLog from "../../attendance/models/activity-logs-model.js";

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
}

export default LogService;
