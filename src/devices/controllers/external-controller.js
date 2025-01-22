// This controller is responsible for handling the external services that the application interacts with.
import userRoleRelationModel from "../../users/models/user-role-relation-model.js";
import customRolesModel from "../../users/models/custom-roles-model.js";
import sessionModel from "../models/session-model.js";

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
            


        }
        catch(err){
            console.log(`An error occurred while sending message in the controller : ${err.message}`);
            if(err instanceof Error){
                return res.status(400).json({success: false, error: err.message});
            }
            return res.status(500).json({success: false, error: `An error occurred while sending message : ${err.message}`});
        }
    }
}