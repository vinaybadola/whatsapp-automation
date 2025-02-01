import mongoose from 'mongoose';
const {Schema}  = mongoose;

const allowedWindowSchema = new Schema({
    shiftName: { type: String, required: true }, 
    startTime: { type: String, required: true }, 
    endTime: { type: String, required: true }, 
    punchInWindow: {
      start: { type: String,  }, 
      end: { type: String,  },
    },
    punchOutWindow: {
      start: { type: String,  }, 
      end: { type: String,  }, 
    },
    breakWindow: {
      start: { type: String,  },
      end: { type: String,  },
    },
    OvertimeWindow: {
      start: { type: String,  },
      end: { type: String,  },
    },
    status: { type: String, default: 'active' },
},{ timestamps: true });

const AllowedWindow = mongoose.model('AllowedWindow', allowedWindowSchema);
export default AllowedWindow;
