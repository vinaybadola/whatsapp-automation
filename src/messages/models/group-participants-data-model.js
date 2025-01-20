import mongoose from "mongoose";
const {Schema} = mongoose;

const GroupParticipantsSchema = new Schema({
    userId : {type : Schema.Types.ObjectId, ref: 'User', required: true, index: true},
    participants: [
        {
          phoneNumber: { type: String, required: true }, // Participant's phone number
          name: { type: String }, // Participant's name (if available)
        },
      ],
}, {timestamps: true});

const GroupParticipants = mongoose.model('group-participants', GroupParticipantsSchema);

export default GroupParticipants;