import mongoose from "mongoose";
const {Schema} = mongoose;

const templateSchema = new Schema({
    subject : {type: String, required: true},
    template : {type: String, required: true, trim: true, index: true},
    templateType : {type: String, required: true, index: true, unique : true},
    shouldBeSentToGroup : {type: Boolean, default: true},
    groupConfigurationId: { type: Schema.Types.ObjectId, ref: "group-configuration", index: true, required: function() { return this.shouldBeSentToGroup; } },
    placeholders : {type: Array},
    isActive : {type: Boolean, default: true},
}, {timestamps: true});

const Template = mongoose.model("Template", templateSchema);

export default Template;