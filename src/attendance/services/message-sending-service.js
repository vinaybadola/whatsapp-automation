import userRoleRelationModel from "../../users/models/user-role-relation-model.js";
import customRolesModel from "../../users/models/custom-roles-model.js";
import { shiftRoasterDB } from "../../../config/externalDatabase.js";
import {connectServices} from '../../devices/services/connectServices.js';
import {formatPhoneNumber} from '../../../helpers/message-helper.js';
import DeviceListModel from "../../devices/models/device-list-model.js";
import Template from "../../templates/models/template-model.js";
import {formatMessage} from '../../../helpers/message-helper.js';
import UserAttendance from "../../attendance/models/user-attendance-model.js";
import moment from 'moment-timezone';

export default class MessageSendingService{
    constructor(){
    }

    sendMessage = async(userData)=>{
        try{

             if(userData.length === 0){
                console.log('No data found to send message');
                return "No data found to send message";
             }
            //TODO: if HR department not found then send message using ADMIN and inform the admin via email

            const findUserRoleId = await customRolesModel.findOne({name : "HR-Department", status : true}).select('_id');

            if(!findUserRoleId){
                throw new Error('Role not found with name HR-Department or marked as inactive ! kindly create the role first');
            }

            const findUserId = await userRoleRelationModel.findOne({roleId : findUserRoleId}).select('userId');
            if(!findUserId){
                throw new Error('User not found with role HR-Department! kindly create the user first');
            }
            // const userDetails = await userDB.collection('personal').findOne({ employeeCode: userData.EmpCode });
            const devicePhone = await DeviceListModel.findOne({ status: 'online', userId: findUserId.userId })
            .select('devicePhone') 
            .populate({
              path: 'sessionId',
              select: 'socketessionId'
            });

            if(!devicePhone){
                throw new Error('No device found for HR-Department');
            }
            if(!devicePhone.sessionId.socketessionId){
                throw new Error('No Device is connected from HR-Department');
            }

            let templateCache = {};
            const fetchTemplatesFrom = ["employee-checkout", "employee-attendance-late", "employee-attendance-on-time" , "employee-attendance-half-day"];

            for (const templateType of fetchTemplatesFrom) {
                const template = await Template.findOne({ templateType }).select('template');   
                templateCache[templateType] = template.template;
            }

            // call the external api to get the user phone number 
            for (const record of userData) {

                const getUserData = await shiftRoasterDB.collection('excelshiftdatas').findOne({ employeeCode: record.employeeCode });
                
                if (!getUserData && getUserData == "undefined" ) {
                    console.log(`Phone number not found for employee ${record.EmpCode}`);
                    await UserAttendance.updateOne({ _id: record._id }, { $set: { reasonForNotSendingMessage: "Phone Number does not exist on shiftRoster database!" } });
                    continue;
                }
                const formattedPhoneNumber = formatPhoneNumber(getUserData.mobile);
                               
                const sessionId = devicePhone.sessionId.socketessionId;
                let messageContent = "";

                const formattedTime = moment.parseZone(record.time).format('dddd, MMMM Do YYYY, h:mm A');
                if(record.employeeLateMinutes > 0 && record.punchType ==="punch-in" && record.isHalfDayToday === false){
                    const data = {
                        firstName: getUserData.name,
                        time: formattedTime,
                        employeeLateMinutes: record.employeeLateMinutes
                    }
                    messageContent = formatMessage(data, templateCache["employee-attendance-late"]);
                }
                else if(record.employeeLateMinutes == 0 && record.punchType ==="punch-in"){
                    const data = {
                        firstName: getUserData.name,
                        time: formattedTime
                    }
                    messageContent = formatMessage(data, templateCache["employee-attendance-on-time"]);
                }
                else if(record.punchType ==="punch-in" && record.isHalfDayToday === true){
                    const data = {
                        firstName: getUserData.name,
                        time: formattedTime
                    }
                    messageContent = formatMessage(data, templateCache["employee-attendance-half-day"]);
                }
                else if(record.punchType ==="punch-out"){
                    const data = {
                        firstName: getUserData.name,
                        // time: formattedTime
                    }
                    messageContent = formatMessage(data, templateCache["employee-checkout"]);
                }
                // await connectServices.sendIndividualMessage(sessionId, "io", findUserId.userId, formattedPhoneNumber, messageContent, "message-processing", devicePhone, "attendance");
            }

            return "Job completed successfully";
        }
        catch(error){
            throw new Error(`Error in sending message: ${error}`);
        }
    }

}
