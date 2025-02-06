import mongoose from "mongoose";
const {Schema} = mongoose;

const InterestedUserSchema = new Schema({
    userPhone : {type : String, required : true},
    response : {type : String, required : true},
    is_processed : {type : Boolean, default: false},  // This field is used to track if we send the message to the sales team or not
}, {timestamps: true});

export default mongoose.model('interested-user', InterestedUserSchema);