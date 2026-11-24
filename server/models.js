import mongoose from 'mongoose';

const { Schema } = mongoose;

function baseTransform(_doc, raw) {
  const result = raw;
  result.id = String(result._id);
  delete result._id;
  delete result.__v;
  return result;
}

function userTransform(doc, raw) {
  const result = baseTransform(doc, raw);
  delete result.passwordHash;
  return result;
}

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    passwordHash: { type: String, required: true },
    wishlist: { type: [String], default: [] },
    createdAt: { type: Date, default: Date.now },
  },
  {
    versionKey: false,
    toJSON: { transform: userTransform },
  },
);

// Explicitly strip the hash even if a caller uses toObject() elsewhere.
userSchema.methods.toSafeObject = function toSafeObject() {
  const raw = this.toObject();
  delete raw.passwordHash;
  delete raw.__v;
  return { ...raw, id: String(raw._id) };
};

const tripSchema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    origin: { type: String, default: '', trim: true, maxlength: 120 },
    destination: { type: String, default: '', trim: true, maxlength: 80 },
    destinationName: { type: String, default: '', trim: true, maxlength: 120 },
    startDate: { type: Date },
    endDate: { type: Date },
    travellers: { type: Number, default: 1, min: 1, max: 100 },
    budget: { type: Number, default: 0, min: 0 },
    preferences: { type: [String], default: [] },
    tripType: { type: String, default: '', trim: true, maxlength: 60 },
    itinerary: { type: [Schema.Types.Mixed], default: [] },
    expenses: { type: [Schema.Types.Mixed], default: [] },
    status: {
      type: String,
      default: 'draft',
      enum: ['draft', 'planned', 'active', 'completed', 'cancelled'],
    },
    createdAt: { type: Date, default: Date.now },
  },
  {
    versionKey: false,
    toJSON: { transform: baseTransform },
  },
);

export const User = mongoose.models.User ?? mongoose.model('User', userSchema);
export const Trip = mongoose.models.Trip ?? mongoose.model('Trip', tripSchema);
