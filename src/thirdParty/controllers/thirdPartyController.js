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

    processInterstedUser = async (req, res) => {
        try {
            // Check if the event type is 'User initiated'
            if (req.body.events.eventType === 'User initiated') {
                console.log('response-body', req.body);
                console.log('message', req.body.eventContent.message.button.text);
                console.log('phone', req.body.eventContent.message.from);

                 const response = req.body.eventContent.message.button.text;
                 if (response.toLowerCase() === "interested") {
                    let phone = req.body.eventContent.message.from;
                    if (!phone.startsWith('+')) {
                         phone = '+' + phone;
                    }
                    const source = "whatsapp";
                    const type = "sales-query";
 
                    // Validate required fields
                    if (!phone || !response || !source || !type) {
                        throw new Error("Phone, response, type, and source are required");
                    }
    
                    // Get the socket.io instance
                    const io = req.app.get('socketio');
    
                    // Send the group message using the third-party service
                    const data = await this.thirdPartyServices.sendGroupMessage({ phone, response, source, io, type });
    
                    return res.status(200).json(data);
                } else {
                    return res.status(202).json({ success: true, message: "Waiting for the user to respond with 'Interested'" });
                }
            } else {
                return res.status(202).json({ success: true, message: "Waiting for a 'User initiated' event" });
            }
        } catch (error) {
            console.log(`An unexpected Error occurred while processing interested user: ${error.message}`);
    
            // Handle specific errors
            if (error instanceof Error) {
                return res.status(400).json({ success: false, error: error.message });
            }
    
            // Handle generic errors
            return res.status(500).json({ success: false, message: "Internal Server Error", error: error });
        }
    };
}