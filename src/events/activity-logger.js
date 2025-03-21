import eventHandler from "../events/event-handler.js";
import LogService from "./services/log-service.js";

eventHandler.on("logActivity", async (data) => {
    try {
        await LogService.logActivity(data);
    } catch (error) {
        console.error("Error logging activity:", error);
    }
});

export default eventHandler;
