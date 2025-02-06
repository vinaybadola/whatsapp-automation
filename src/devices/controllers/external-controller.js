// This controller is responsible for handling the external services that the application interacts with.
import userRoleRelationModel from "../../users/models/user-role-relation-model.js";
import customRolesModel from "../../users/models/custom-roles-model.js";
import sessionModel from "../models/session-model.js";
import ExternalApiService from "../services/externa-api-services.js";
import Template from "../../templates/models/template-model.js";
import {formatMessage} from "../../../helpers/message-helper.js";
export default class ExternalController{
    constructor(){
        this.externalApiService = new ExternalApiService();
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
            const {apiToken, message, phoneNumber,source} = req.body;

            if(!apiToken || !message || !phoneNumber){
                return res.status(400).json({success: false, error: 'Missing required fields'});
            }

            const response = await this.externalApiService.sendIndividualMessage(apiToken, message, phoneNumber,source);

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
            const {data, source, type} = req.body;

            if(!data || !source || !type){
                throw new Error('Missing required fields');
            }
          
            const io = req.app.get('socketio');

            const templateData = await Template.findOne({templateType :type}).populate('groupConfigurationId');

            if(!templateData){
                throw new Error("Group Configuration not found");
            }

            const groupId = templateData.groupConfigurationId?.groupId;
            const apiToken = templateData.groupConfigurationId?.apiToken;

            const template = templateData?.template;

            const message = formatMessage(data,template);
            const response = await this.externalApiService.sendGroupMessage({groupId, apiToken, message ,source, io});
            if(response){
                return res.status(200).json({ success: true, message: "Message has been Queued" });
            }
            
            return res.status(400).json({success: false , message : "An error occurred while sending group message"});
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