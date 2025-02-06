import WhatsAppClient from "../services/whatsapp-service.js";
import ThirdPartyServices from "../services/third-party-services.js";
import ExternalApiService from "../../devices/services/externa-api-services.js";
export default class ThirdPartyController{
    constructor(){
        this.whatsappClient = new WhatsAppClient();
        this.externalApiService = new ExternalApiService();
        this.thirdPartyServices = new ThirdPartyServices(this.externalApiService);
    }

    sendMessage = async(req,res)=>{
        try{            
            await this.whatsappClient.sendGroupMessage(req.body);
            return res.status(200).json({success:true, message: "Sms sent successfully"});
        }
        catch(err){
        console.log(`An unexpected Error occurred while sending Messsage to group : ${err.message}`);
        if(err instanceof Error){
            return res.status(400).json({success: false, error : err.message});
        }
        return res.status(500).json({success: false, message: "Internal Server Error", error: err});
        }
    }

    processInterstedUser = async(req,res)=>{
        try{
            const {phone, response, source, type} = req.body;
            if(!phone || !response || !source || !type){
                throw new Error("Phone, response, type and source are required");
            }
            const io = req.app.get('socketio');
            const data = await this.thirdPartyServices.sendGroupMessage({phone, response, source, io, type});
            return res.status(200).json(data);
        }
        catch(error){
            console.log(`An unexpected Error occurred while processing interested user : ${error.message}`);
            if(error instanceof Error){
                return res.status(400).json({success: false, error : error.message});
            }
            return res.status(500).json({success: false, message: "Internal Server Error", error: error});
        }
    }
}