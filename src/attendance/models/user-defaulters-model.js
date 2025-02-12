import mongoose from 'mongoose';
const {Schema} = mongoose;

const DefaultersSchema = new Schema({

},{timestamps :true});

const Defaulters = mongoose.model('Defaulters', DefaultersSchema);

export default Defaulters;