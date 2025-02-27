import DeviceListModel from "../models/device-list-model.js";
import {connectServices} from '../services/connectServices.js';
import {formatPhoneNumber} from '../../../helpers/message-helper.js';
import sessionModel from "../models/session-model.js";
import userRoleRelationModel from "../../users/models/user-role-relation-model.js";
import customRolesModel from "../../users/models/custom-roles-model.js";
import DeviceListServices from "./device-list-services.js";
import DeviceListRepository from "../repositories/device-list-repository.js";
import UserRepository from "../../users/repositories/user-repository.js";
export default class ExternalApiService{
    constructor(){
        this.deviceListRepository = new DeviceListRepository();
        this.deviceListServices = new DeviceListServices( this.deviceListRepository, new UserRepository());
    }

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
        try{
        const {groupId, apiToken, message, source, io} = data;
        const findUser = await DeviceListModel.findOne({
            apiToken: apiToken,
            reasonForDisconnect: { $ne: 401 }
        }).populate({
            path: 'sessionId',
            select: 'socketessionId'
        });
        console.log('findUser', findUser);
        if (!findUser) {
            throw new Error ("No user found for API token!");
        }
        if(findUser.status === "offline"){
            throw new Error('User device is disconnected');
        }

        const sessionId = findUser.sessionId.socketessionId;
        if (!sessionId) {
            throw new Error('No session found for this device!');
        }
        
        const userId = findUser.userId;
        const mode = "message-processing";
        
        const response = await connectServices.sendMessageGroup(
            sessionId, io, groupId, message, userId, mode, findUser.devicePhone,source
        );
        return response;
    }
    catch(error){
        throw new Error(error.message);
    }
    }

    connectExternalDevice = async (data) => {
        let{ sessionId, role, devicePhone, io } = data;

        if (typeof devicePhone === 'number') {
            devicePhone = devicePhone.toString();
        }

        if (typeof devicePhone === 'string' && devicePhone.length === 10) {
            devicePhone = `91${devicePhone}`;
        }

        if(devicePhone.length > 12){
            throw new Error('Invalid phone number');
        }
       
        let deviceName = role;
        // Check if a connected session already exists
        const sessionExists = await sessionModel.findOne({ socketessionId: sessionId, is_connected: true });
        if (sessionExists) {
          throw new Error('Session already exists for this user');
        }
      
        let userId = null;
        const phoneExists = await DeviceListModel.findOne({ devicePhone });
        if (phoneExists) {
          if (phoneExists.status === 'online') {
            throw new Error('Phone number is already connected');
          }
          if (phoneExists.status === 'offline') {
            userId = phoneExists.userId;
          }
        } else {
          // Phone not found: look up role and associated user
          const findRole = await customRolesModel.findOne({ name: role, status: true }).select('_id');
          if (!findRole) {
            throw new Error(`No role found or role is inactive for ${role}`);
          }
          const findUser = await userRoleRelationModel.findOne({ roleId: findRole._id }).select('userId');
          if (!findUser) {
            throw new Error(`No user found with this role ${role}`);
          }
          userId = findUser.userId; // Assign the found userId
          await this.deviceListServices.createDevice({ deviceName, devicePhone, userId });
        }
      
        const mode = "qr";
        await connectServices.createWhatsAppClient(sessionId, io, userId, devicePhone, mode);
    };
}