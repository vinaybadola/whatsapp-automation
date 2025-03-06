import userRoleRelationModel from "../../users/models/user-role-relation-model.js";
import customRolesModel from "../../users/models/custom-roles-model.js";
import { shiftRoasterDB } from "../../../config/externalDatabase.js";
import { connectServices } from '../../devices/services/connectServices.js';
import { formatPhoneNumber } from '../../../helpers/message-helper.js';
import DeviceListModel from "../../devices/models/device-list-model.js";
import Template from "../../templates/models/template-model.js";
import { formatMessage } from '../../../helpers/message-helper.js';
import UserAttendance from "../../attendance/models/user-attendance-model.js";
import moment from 'moment-timezone';
import {log} from "../../../utils/logger.js";

export default class MessageSendingService {
    constructor() {
    }

    sendMessage = async (record) => {
        try {
            log.info(`sending message for ${record.employeeCode} with punchType ${record.punchType} and isHalfDayToday ${record.isHalfDayToday} and employee late minutes ${record.employeeLateMinutes}`); 
            if (!record) {
                console.log('No data found to send message');
                return "No data found to send message";
            }
            //TODO: if HR department not found then send message using ADMIN and inform the admin via email

            const findUserRoleId = await customRolesModel.findOne({ name: "HR-Department", status: true }).select('_id');

            if (!findUserRoleId) {
                throw new Error('Role not found with name HR-Department or marked as inactive ! kindly create the role first');
            }

            const findUserId = await userRoleRelationModel.findOne({ roleId: findUserRoleId }).select('userId');
            if (!findUserId) {
                throw new Error('User not found with role HR-Department! kindly create the user first');
            }
            // const userDetails = await userDB.collection('personal').findOne({ employeeCode: userData.EmpCode });
            const devicePhone = await DeviceListModel.findOne({ status: 'online', userId: findUserId.userId })
                .select('devicePhone')
                .populate({
                    path: 'sessionId',
                    select: 'socketessionId'
                });

            if (!devicePhone) {
                log.error('No device found for HR-Department');
                throw new Error('No device found for HR-Department');
            }
            if (!devicePhone.sessionId.socketessionId) {
                log.error('No Device is connected from HR-Department');
                throw new Error('No Device is connected from HR-Department');
            }

            let templateCache = {};
            const fetchTemplatesFrom = ["employee-checkout", "employee-attendance-late", "employee-attendance-on-time", "employee-attendance-half-day"];

            for (const templateType of fetchTemplatesFrom) {
                const template = await Template.findOne({ templateType }).select('template');
                templateCache[templateType] = template.template;
            }

            const getUserData = await shiftRoasterDB.collection('excelshiftdatas').findOne({ employeeCode: record.employeeCode });

            if (!getUserData && getUserData == "undefined") {
                console.log(`Phone number not found for employee ${record.employeeCode}`);
                log.error(`Phone number not found for employee ${record.employeeCode}`);
                await UserAttendance.updateOne({ _id: record._id }, { $set: { reasonForNotSendingMessage: "Phone Number does not exist on shiftRoster database!" } });
                return "Phone number not found for employee";
            }
            const formattedPhoneNumber = formatPhoneNumber(getUserData.mobile);

            const sessionId = devicePhone.sessionId.socketessionId;
            let messageContent = "";

            const formattedTime = moment.utc(record.time).format('dddd, MMMM Do YYYY, h:mm A'); // Change the time to the format of the message to be sent
            let lateMinutes = 0;
            if(record.employeeLateMinutes === 0){
                lateMinutes = 0;
            }
            else{
                lateMinutes = this.extractMinutes(record.employeeLateMinutes);  // Change the late Minutes to integer to check for the condition of late minutes
            }  
            if (lateMinutes > 35 && record.punchType === "punch-in" && record.isHalfDayToday === false) {
                const data = {
                    firstName: getUserData.name,
                    time: formattedTime,
                    employeeLateMinutes: record.employeeLateMinutes
                }
                messageContent = formatMessage(data, templateCache["employee-attendance-late"]);
            }
            else if (lateMinutes <= 35 && record.punchType === "punch-in") {
                const data = {
                    firstName: getUserData.name,
                    time: formattedTime
                }
                messageContent = formatMessage(data, templateCache["employee-attendance-on-time"]);
            }
            else if (record.punchType === "punch-in" && record.isHalfDayToday === true) {
                const data = {
                    firstName: getUserData.name,
                    time: formattedTime
                }
                messageContent = formatMessage(data, templateCache["employee-attendance-half-day"]);
            }
            else if (record.punchType === "punch-out") {
                const data = {
                    firstName: getUserData.name,
                }
                messageContent = formatMessage(data, templateCache["employee-checkout"]);
            }
            await connectServices.sendIndividualMessage(sessionId, "io", findUserId.userId, formattedPhoneNumber, messageContent, "message-processing", devicePhone, "attendance");
            //TODO: await UserAttendance.updateOne({ _id: record._id }, { $set: { messageSent: true } });
            log.info(`Message has been queued to ${getUserData.name} with phone number ${formattedPhoneNumber}`);
            return "Job completed successfully";
        }
        catch (error) {
            throw new Error(`Error in sending message: ${error}`);
        }
    }

    extractMinutes(timeString) {
        const match = timeString.match(/(\d+)\s*hours?\s*(\d*)\s*minutes?/);
        if (!match) return 0; // Agar match na mile toh default 0 return kar de
    
        const hours = parseInt(match[1]) || 0;
        const minutes = parseInt(match[2]) || 0;
    
        return (hours * 60) + minutes; 
    }
}
