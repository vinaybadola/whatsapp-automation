import interstedUserModel from "../models/intersted-user-model.js";
import ExternalApiService from "../../devices/services/externa-api-services.js";
import Template from "../../templates/models/template-model.js";
import {formatMessage} from "../../../helpers/message-helper.js";

export default class ThirdPartyServices{
    constructor(){
        this.externalApiService = new ExternalApiService();
    }

    sendGroupMessage = async(data) =>{
        try{
            const {phone, response, source, io, type} = data;
            if(!phone || !response || !source){
                throw new Error("Phone, response and source are required");
            }
            const userRecord = await interstedUserModel.create({userPhone: phone, response: response, is_processed: false});
            const id = userRecord._id;

            const getTemplate = await Template.findOne({templateType :type}).populate('groupConfigurationId');
            
            if(!getTemplate){
                throw new Error(`Template not found for type : ${type}`);
            }
            
            const templateData = await Template.findOne({templateType :type}).populate('groupConfigurationId');

            if(!templateData){
                throw new Error("Group Configuration not found");
            }

            const groupId = templateData.groupConfigurationId?.groupId;
            const apiToken = templateData.groupConfigurationId?.apiToken;

            const template = templateData?.template;

            const message = formatMessage(data,template);

            const apiResponse = await this.externalApiService.sendGroupMessage({groupId, apiToken, message, io, source});
            
            if(apiResponse){
                await interstedUserModel.findByIdAndUpdate(id, {is_processed: true});
            }

            return { success: true, message: "Message has been Queued"};
        }
        catch(error){
            throw new Error(error?.message || "An unexpected error occurred in sendGroupMessage");
        } 
    }  
}