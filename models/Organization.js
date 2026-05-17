import mongoose from "mongoose";

const organizationSchema = new mongoose.Schema({
  name: String,
  location: String,
  description: String,
  
    ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  created_at: { type: Date, default: Date.now },
});

const Organization = mongoose.model("Organization", organizationSchema);
export default Organization;
