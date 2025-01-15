import { instanceId, wmateClientId, wmateClientSecret } from "../../../config/envConfig.js";
import TransactionSchema from "../models/transactions-data-model.js";
import {groupAdminNumber,groupName} from "../../../config/envConfig.js";
export default class WhatsAppClient {

  async sendGroupMessage(data) {

    const message =
    `
      Name : ${data.name},
      Phone : ${data.phone},
      Email : ${data.email},
      City : ${data.city},
      Support Type : ${data.support_type},
      Service Type : ${data.service_type}
    `;

    const dataPayLoad = {
      group_admin: groupAdminNumber,
      group_name: groupName,
      message,
    };

    const url = `http://api.whatsmate.net/v3/whatsapp/group/text/message/${instanceId}`;

    const headers = {
      "Content-Type": "application/json",
      "X-WM-CLIENT-ID": wmateClientId,
      "X-WM-CLIENT-SECRET": wmateClientSecret,
    };

    const transaction = new TransactionSchema({
      groupAdmin: dataPayLoad.group_admin,
      groupName: dataPayLoad.group_name,
      message: dataPayLoad.message,
      instanceId,
      isSent: "false",
    });

    try{

      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(dataPayLoad),
      });

      const responseData = await response.text();
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      transaction.isSent = "true";
      transaction.apiResponse = responseData;
    }
    catch(err){
      transaction.errorMessage = err.message;
      console.error("Error:", err);
    }
    finally{
      await transaction.save();
    }
  }
}