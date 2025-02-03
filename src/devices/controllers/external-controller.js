// This controller is responsible for handling the external services that the application interacts with.
import userRoleRelationModel from "../../users/models/user-role-relation-model.js";
import customRolesModel from "../../users/models/custom-roles-model.js";
import sessionModel from "../models/session-model.js";
import DeviceListModel from "../models/device-list-model.js";
import {connectServices} from '../services/connectServices.js';
import {formatPhoneNumber} from '../../../helpers/message-helper.js';

export default class ExternalController{
    constructor(){
    }

    fetchUser = async(req,res)=>{
        try{
            const{type} = req.params;
            let users = await customRolesModel.find({name : type, isActive : true});
            if(users.length === 0){
                users = await customRolesModel.find({name : "default"});
                if(users.length === 0){
                    return res.status(400).json({success: false, error: 'No user found'});
                }                
            }
            const userId = await userRoleRelationModel.findOne({roleId : users[0]._id});

            const sessionId = await sessionModel.findOne({user_id : userId.userId, is_connected : true});
            if(!sessionId){
                return res.status(400).json({success: false, error: 'No session found'});
            }

            return res.status(200).json({success: true, data: sessionId});

        }
        catch(err){
            console.log(`An error occurred while fetching user in the controller : ${err.message}`);
            if(err instanceof Error){
                return res.status(400).json({success: false, error: err.message});
            }
            return res.status(500).json({success: false, error: `An error occurred while fetching user : ${err.message}`});
        }
    }

    sendIndividualMessage = async(req,res)=>{
        try{
            const {apiToken, message, phoneNumber} = req.body;
            if(!apiToken || !message || !phoneNumber){
                return res.status(400).json({success: false, error: 'Missing required fields'});
            }
            const findUser = await DeviceListModel.findOne({
                apiToken: apiToken,
                reasonForDisconnect: { $ne: 401 }
            }).populate({
                path: 'sessionId',
                select: 'socketessionId' 
            });

            if (!findUser) {
                return res.status(400).json({ success: false, error: 'No user found for API token!' });
            }
            const sessionId = findUser.sessionId?.socketessionId;
            if (!sessionId) {
                return res.status(400).json({ success: false, error: 'No session found for this device!' });
            }
            
            const userId = findUser.userId;
            const devicePhone = findUser.devicePhone;
            const mode = "message-processing";
            const io = req.app.get('socketio');
            const formattedPhoneNumber = formatPhoneNumber(phoneNumber); 
            const messageContent = message;
            const response = await connectServices.sendIndividualMessage(sessionId, io, userId, formattedPhoneNumber, messageContent, mode, devicePhone);

            return res.status(200).json({ success: true, message: response.message });
        }
        catch(err){
            console.log(`An error occurred while sending message in the controller : ${err.message}`);
            if(err instanceof Error){
                return res.status(400).json({success: false, error: err.message});
            }
            return res.status(500).json({success: false, error: `An error occurred while sending message : ${err.message}`});
        }
    }

    sendGroupMessage = async(req,res) =>{
        try{
            const {groupId, apiToken, message} = req.body;
            if(!groupId || !apiToken || !message){
                return res.status(400).json({success: false, error: 'Missing required fields'});
            }
            const findUser = await DeviceListModel.findOne({
                apiToken: apiToken,
                reasonForDisconnect: { $ne: 401 }
            }).populate({
                path: 'sessionId',  // This should match the field name in your schema
                select: 'socketessionId'  // Fetch only the socketessionId field
            });
            
            if (!findUser) {
                return res.status(400).json({ success: false, error: 'No user found for API token!' });
            }
            
            const sessionId = findUser.sessionId?.socketessionId;
            if (!sessionId) {
                return res.status(400).json({ success: false, error: 'No session found for this device!' });
            }
            
            const userId = findUser.userId;
            const mode = "message-processing";
            const io = req.app.get('socketio');
            
            const response = await connectServices.sendMessageGroup(
                sessionId, io, groupId, message, userId, mode, findUser.devicePhone
            );
            
            return res.status(200).json({ success: true, message: response.message });
        }
        catch(error){
            console.log(`An error occurred while sending group message in the controller : ${error.message}`);
            if(error instanceof Error){
                return res.status(400).json({success: false, error: error.message});
            }
            return res.status(500).json({success: false, error: `An error occurred while sending group message : ${error.message}`});
        }
    }
}