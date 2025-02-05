import DeviceListModel from "../models/device-list-model.js";
import {connectServices} from '../services/connectServices.js';
import {formatPhoneNumber} from '../../../helpers/message-helper.js';

export default class ExternalApiService{

    sendIndividualMessage = async(data)=>{
        const {apiToken, message, phoneNumber, source} = data;
        const findUser = await DeviceListModel.findOne({
            apiToken: apiToken,
            reasonForDisconnect: { $ne: 401 }
        }).populate({
            path: 'sessionId',
            select: 'socketessionId' 
        });

        if (!findUser) {
            return response({ success: false, error: 'No user found for API token!' });
        }
        const sessionId = findUser.sessionId?.socketessionId;
        if (!sessionId) {
            return response({ success: false, error: 'No session found for this device!' });
        }
        
        const userId = findUser.userId;
        const devicePhone = findUser.devicePhone;
        const mode = "message-processing";
        const io = req.app.get('socketio');
        const formattedPhoneNumber = formatPhoneNumber(phoneNumber); 
        const messageContent = message;
        const response = await connectServices.sendIndividualMessage(sessionId, io, userId, formattedPhoneNumber, messageContent, mode, devicePhone,source);
        return response({ success: true, message: response.message });
    }

    sendGroupMessage = async(data) =>{
        const {groupId, apiToken, message, io, source} = data;
        const findUser = await DeviceListModel.findOne({
            apiToken: apiToken,
            reasonForDisconnect: { $ne: 401 }
        }).populate({
            path: 'sessionId',
            select: 'socketessionId'
        });
        if (!findUser) {
            return { success: false, error: 'No user found for API token!' };
        }
        if(findUser?.status === "offline"){
            return {success: false, error: 'User device is disconnected'};
        }

        const sessionId = findUser.sessionId?.socketessionId;
        if (!sessionId) {
            return { success: false, error: 'No session found for this device!' };
        }
        
        const userId = findUser.userId;
        const mode = "message-processing";
        
        const response = await connectServices.sendMessageGroup(
            sessionId, io, groupId, message, userId, mode, findUser.devicePhone,source
        );
        return {success: true, message: response.message};
    }
}