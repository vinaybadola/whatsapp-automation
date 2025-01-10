import { initializeWhatsApp, getQRCode, checkConnectionStatus } from '../../thirdParty/services/whatsapp-service.js';
import {log} from '../../../utils/logger.js';

export default class DeviceConnectController {
    connect = async(req,res) =>{
        try{
            res.sendFile('connect.html', { root: './public' });
        }
        catch(err){
            log.error(err.message);
            this.errorResponseHandler('Error connecting device', 500, res);
        }
    }

    generateQr = async(req,res) =>{
        const { sessionId } = req.body;
        const io = req.app.get('io'); 
      
        try {
          await initializeWhatsApp(io);
          const qrCode = await getQRCode(sessionId, io);
      
          res.status(200).json({ success: true, qrCode });
        }
        catch(err){
            log.error(err.message);
            this.errorResponseHandler('Error generating QR code', 500, res);
        }
    }

    errorResponseHandler(errorMessage, ErrorStatusCode, res){
        log.error(`Error: ${errorMessage}`);
        return res.status(ErrorStatusCode).json({success: false,message: errorMessage });
    }

    
}