import mongoose from "mongoose";


const deviceSchema = new mongoose.Schema({
    orgId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization" },
  name: String,
  type: String,
device_id: { type: String, required: true, unique: true },

    status: { type: String, default: "offline" },
    deviceIp: { type: String, default: "" },
  isRunning: { type: Boolean, default: false },
    registered_at: { type: Date, default: Date.now },
    last_seen_at: { type: Date, default: Date.now }
});

const Device = mongoose.model('Device', deviceSchema);

export default Device;