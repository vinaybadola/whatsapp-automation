import sessionModel from "../src/devices/models/session-model.js";

class SessionHelper {
    async getValidSession(sessionId, userId) {
        try {
            return await sessionModel.findOne({ 
                socketessionId: sessionId, 
                user_id: userId, 
                is_connected: true 
            });
        } catch (err) {
            console.error("Error fetching session:", err);
            throw new Error("Failed to fetch session.");
        }
    }
}


export default SessionHelper = new SessionHelper();

