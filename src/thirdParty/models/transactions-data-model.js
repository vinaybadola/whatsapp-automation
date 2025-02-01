import mongoose from 'mongoose';
const {Schema} = mongoose;

const TransactionSchema = new Schema({
    groupAdmin: {type: String},
    groupName: {type: String},
    message : {type: String},
    instanceId : {type: String},
    isSent: {type : String, default: 'false'},
    apiResponse: {type: String},
    errorMessage : {type: String}
},{timestamps: true});

export default mongoose.model('transaction-data', TransactionSchema);