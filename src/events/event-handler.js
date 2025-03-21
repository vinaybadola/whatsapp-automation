import EventEmitter from "events";

// This allows us to emit events from anywhere (eventHandler.emit(...)).
// Other files can listen to these events without modifying our core API logic.

class EventHandler extends EventEmitter {}

const eventHandler = new EventHandler();

export default eventHandler;
