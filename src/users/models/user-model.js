import mongoose from 'mongoose';
const { Schema } = mongoose;
import jwt from 'jsonwebtoken';
const { sign } = jwt; 
import pkg from 'bcryptjs';
const { hash, compare } = pkg;

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, index: true, trim: true },
    password: { type: String, required: true, trim: true },
    role: { type: String, enum: ['admin', 'user'], default: 'user' },
    phone: { type: String, required: true, unique: true, trim: true , index: true},
    language: { type: String, trim: true, default: 'en' },
    country: { type: String , default : "India"},
    status: { type: Boolean, default: true },
    userName: { type: String, required: true, unique: true, trim: true },
    profileImage: { type: String },
    customRole : {type: Schema.Types.ObjectId, ref : 'customr-roles-schema'},
    tokens: [{ token: { type: String } }],
  },
  { timestamps: true }
);

// Hash the password before saving the user
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const hashedPassword = await hash(this.password, 10);
    this.password = hashedPassword;
    next();
  } catch (error) {
    console.error(`Error while hashing password: ${error.message}`);
    next(error);
  }
});

// Compare the provided password with the hashed password
userSchema.methods.comparePassword = function (password) {
  return compare(password, this.password);
};

// Generate an authentication token for the user
userSchema.methods.generateAuthToken = function () {
  const token = sign(
    { _id: this._id, email: this.email, role: this.role }, 
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
  this.tokens = [{ token }];
  return token;
};

export default mongoose.model('User', userSchema);