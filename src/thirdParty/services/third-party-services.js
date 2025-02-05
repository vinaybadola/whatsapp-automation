import interstedUserModel from "../models/intersted-user-model.js";
import groupConfigurationModel from "../../messages/models/group-configuration-model.js";
import ExternalApiService from "../../devices/services/externa-api-services.js";

export default class ThirdPartyServices{
    constructor(){
        this.externalApiService = new ExternalApiService();
    }

    sendGroupMessage = async(data) =>{
        try{
            const {phone, response, source, io} = data;
            if(!phone || !response || !source){
                throw new Error("Phone, response and source are required");
            }

            if(response.trim().toLowerCase() !== "yes" && response.trim().toLowerCase() !== "no"){
                throw new Error("Response should be either 'yes' or 'no'");
            }

            const userRecord = await interstedUserModel.create({userPhone: phone, response: response, is_processed: false});
            const id = userRecord._id;

            const groupConfiguration = await groupConfigurationModel.findOne({type : "sales-query"}).populate('templateId');
            if(!groupConfiguration){
                throw new Error("Group Configuration not found");
            }
            
            const template = groupConfiguration?.templateId?.template;
            if(!template){
                throw new Error("Template not found in group configuration");
            }
            const message = template.replace(/{{phone}}/g, phone).replace(/{{response}}/g, response).replace(/{{source}}/g, source);

            const apiResponse = await this.externalApiService.sendGroupMessage({groupId: groupConfiguration.groupId, apiToken: groupConfiguration.apiToken, message: message, io, source: source});
            
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