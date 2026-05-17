import Device from "../models/Device.js";
import sensorData from "../models/SensorData.js";


export const sensorDataStream = async (req, res) => {
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

  device.last_seen_at = new Date();
  device.status = "online";
  await device.save();

  res.status(201).json(data);
};