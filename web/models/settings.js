import mongoose from "mongoose";

// Define the schema for settings
const SettingsSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
});

const Settings = mongoose.model("Settings", SettingsSchema);
module.exports = Settings;