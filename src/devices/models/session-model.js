import mongoose from 'mongoose';
const {Schema} = mongoose;

const sessionSchema = new Schema({
    socketessionId: { type: String, required: true, unique: true },
    authState: { type: Object, required: true },
    qr_code: String,
    is_connected: {type : Boolean, default : false},
    user_id: {type : Schema.Types.ObjectId, required: true},
}, {timestamps: true});

export default mongoose.model('Session', sessionSchema);