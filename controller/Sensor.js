import Device from "../models/Device.js";
import sensorData from "../models/SensorData.js";
import redisClient from "../config/redis.js";


export const sensorDataStream = async (req, res) => {

  try{
 console.log("Sensor request body:", req.body);

  const device = await Device.findOne({ device_id: req.body.device_id });

  console.log("Found device:", device);

  if (!device) {
    return res.status(404).json({ message: "Device not registered" });
  }

  if (!device.isRunning) {
    return res.status(409).json({ message: "Device is stopped" });
  }

  const data = await sensorData.create({
    device_id: req.body.device_id,
    temperature: req.body.temperature,
    pressure: req.body.pressure,
  });

  console.log("Sensor data saved:", data);

    const now = new Date();

    // Save latest live data in Redis
    await redisClient.hSet(`device:${req.body.device_id}:latest`, {
      lastSeen: now.toISOString(),
      temperature: String(req.body.temperature ?? ""),
      pressure: String(req.body.pressure ?? ""),
    });

  device.last_seen_at = now;
  device.status = "online";
  await device.save();
  res.status(201).json({
      message: "Sensor data saved successfully",
      data,
      lastSeen: now,
    });
  }catch(err){  
    console.error("Error processing sensor data:", err);
    res.status(500).json({
      message: "Failed to process sensor data", 
      error: err.message,
    });
  }
 
};