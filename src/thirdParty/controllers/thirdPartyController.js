import WhatsAppClient from "../services/whatsapp-service.js";

export default class ThirdPartyController{
    constructor(){
        this.whatsappClient = new WhatsAppClient();
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
}