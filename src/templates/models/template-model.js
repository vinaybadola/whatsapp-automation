import mongoose from "mongoose";
const {Schema} = mongoose;

const templateSchema = new Schema({
    subject : {type: String, required: true},
    template : {type: String, required: true},
    templateType : {type: String, required: true},
    isActive : {type: Boolean, default: true},
}, {timestamps: true});

const Template = mongoose.model("Template", templateSchema);

export default Template;