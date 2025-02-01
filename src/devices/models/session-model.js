import mongoose from 'mongoose';
const {Schema} = mongoose;

const sessionSchema = new Schema({
    socketessionId: { type: String,unique: true, required: true ,sparse: true},
    authState: { type: Object },
    qr_code: {type : String},
    is_connected: {type : Boolean, default : false},
    user_id: {type : Schema.Types.ObjectId, ref: 'User'},
}, {timestamps: true});

export default mongoose.model('Session', sessionSchema);