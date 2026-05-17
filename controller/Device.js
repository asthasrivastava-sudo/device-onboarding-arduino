import Device from "../models/Device.js";
import Organization from "../models/Organization.js";

const callArduino = async (url, options = {}) => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, 3000);
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        message: data?.message || "Arduino rejected request",
      };
    }
    return {
      ok: true,
      status: response.status,
      data,
    };
  } catch (error) {
    if (error.name === "AbortError") {
      return {
        ok: false,
        status: 408,
        message: "Arduino request timed out",
      };
    }
    return {
      ok: false,
      status: 503,
      message:
        "Arduino not reachable. Check device IP, WiFi, or Arduino power.",
      error: error.message,
    };
  }
};

 // routes in server.js
 export const OrganizationSpecificDevices =  async (req, res) => {
    const devices = await Device.find(
      req.params.orgId ? { orgId: req.params.orgId } : {},
    );
    console.log("Devices for orgId", req.params.orgId, devices);
    res.json(devices);
  };
  export const DeviceRegistration =  async (req, res) => {
  
    const {
      orgId,
      name,
      type,
      deviceIp,
    } = req.body;
  
    // =========================
    // BASIC VALIDATION
    // =========================
  
    if (!orgId || !name || !type || !deviceIp) {
      return res.status(400).json({
        message: "orgId, name, type and deviceIp are required",
      });
    }
  if (!net.isIP(deviceIp)) {
    return res.status(400).json({
      message: "Invalid IP address",
    });
  }
    // =========================
    // CHECK ORGANIZATION EXISTS
    // =========================
  
    const organization = await Organization.findById(orgId);
  
    if (!organization) {
      return res.status(404).json({
        message: "Organization not found",
      });
    }
  
    // =========================
    // CHECK DUPLICATE DEVICE IP
    // =========================
  
    const existingDeviceIp = await Device.findOne({
      deviceIp,
    });
  
    if (existingDeviceIp) {
      return res.status(400).json({
        message: "Device IP already registered",
      });
    }
  
    // =========================
    // CREATE DEVICE
    // =========================
  
    const device_id = uuidv4();
  
    const result = await Device.create({
      orgId,
      name,
      type,
      deviceIp,
      device_id,
      status: "offline",
      isRunning: false,
      registered_at: new Date(),
    });
  
    console.log("=================================");
    console.log("[NEW DEVICE REGISTERED]");
    console.log(result);
    console.log("=================================");
  
    const arduinoUrl = `http://${result.deviceIp}/register-device`;
  
    console.log("Sending REGISTER request to Arduino:");
    console.log({
      url: arduinoUrl,
      device_id: result.device_id,
    });
  
    // =========================
    // SEND DEVICE ID TO ARDUINO
    // =========================
  
    const arduinoResult = await callArduino(arduinoUrl, {
      method: "POST",
  
      headers: {
        "Content-Type": "application/json",
      },
  
      body: JSON.stringify({
        device_id: result.device_id,
      }),
    });
  
    console.log("Arduino REGISTER result:");
    console.log(arduinoResult);
  
    // =========================
    // HANDLE ARDUINO FAILURE
    // =========================
  
    if (!arduinoResult.ok) {
  
      result.status = "registration_failed";
  
      await result.save();
  
      return res.status(arduinoResult.status).json({
        message: arduinoResult.message,
        device: result,
      });
    }
  
    // =========================
    // SUCCESS
    // =========================
  
    result.status = "registered";
  
    await result.save();
  
    res.status(201).json({
      message: "Device registered successfully",
      device: result,
    });
  };
export const startDevice = async (req, res) => {
    const device = await Device.findById(req.params.id);
  
    if (!device) {
      return res.status(404).json({ message: "Device not found" });
    }
  
    if (!device.deviceIp) {
      return res.status(400).json({ message: "Device IP is missing" });
    }
  
    const arduinoUrl = `http://${device.deviceIp}/start`;
  
    console.log("Sending START to Arduino:", arduinoUrl);
  
    const arduinoResult = await callArduino(arduinoUrl, {
      method: "POST",
    });
  
    console.log("Arduino START result:", arduinoResult);
  
    if (!arduinoResult.ok) {
      return res.status(arduinoResult.status).json({
        message: arduinoResult.message,
        error: arduinoResult.error,
      });
    }
  
    device.isRunning = true;
    device.status = "online";
    await device.save();
  
    res.json(device);
  };
  
export const stopDevice =  async (req, res) => {
    const device = await Device.findById(req.params.id);
  
    if (!device) {
      return res.status(404).json({ message: "Device not found" });
    }
  
    if (!device.deviceIp) {
      return res.status(400).json({ message: "Device IP is missing" });
    }
  
    const arduinoUrl = `http://${device.deviceIp}/stop`;
  
    console.log("Sending STOP to Arduino:", arduinoUrl);
  
    const arduinoResult = await callArduino(arduinoUrl, {
      method: "POST",
    });
  
    console.log("Arduino STOP result:", arduinoResult);
  
    if (!arduinoResult.ok) {
      return res.status(arduinoResult.status).json({
        message: arduinoResult.message,
        error: arduinoResult.error,
      });
    }
  
    device.isRunning = false;
    device.status = "offline";
    await device.save();
  
    res.json(device);
  };
  
export const deviceCheckStatus = async (req, res) => {
    const device = await Device.findOne({ device_id: req.params.deviceId });
    res.json({ isRunning: Boolean(device?.isRunning) });
  };
  