import mongoose from "mongoose";
const { Schema } = mongoose;

const ActivityLogSchema = new Schema(
  {
    userName: { type: String, required: true }, 
    employeeCode: { type: String },

    action: { type: String, enum: ["CREATE", "UPDATE", "DELETE"], required: true }, 
    entity: { type: String, required: true }, // Affected collection/module (e.g., "UserAttendance")
    affectedSchema : { type: String, required: true }, // Affected schema (e.g., "UserAttendance")
    entityId: { type: Schema.Types.ObjectId, required: true }, // ID of affected document

    changes: { type: Object }, // Stores old & new values for updates
    requestPayload: { type: Schema.Types.Mixed, default: {} },
    activityMessage : {type : String},

    ipAddress: { type: String }, // User's IP address
    userAgent: { type: String }, // Browser/device details
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const ActivityLog = mongoose.model("activity-log", ActivityLogSchema);
export default ActivityLog;
