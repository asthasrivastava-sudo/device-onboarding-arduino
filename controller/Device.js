import Device from "../models/Device.js";
import Organization from "../models/Organization.js";
import net from "net";
import { v4 as uuidv4 } from "uuid";
import redisClient from "../config/redis.js";

const callArduino = async (url, options = {}, timeoutMs = 3000) => {
  const controller = new AbortController();

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

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
        message: "Arduino request timed out. Please check hardware connection.",
      };
    }

    return {
      ok: false,
      status: 503,
      message: "Arduino not reachable. Check device IP, WiFi, or Arduino power.",
      error: error.message,
    };
  } finally {
    clearTimeout(timeoutId);
  }
};
 // routes in server.js
export const OrganizationSpecificDevices = async (req, res) => {
  try {
    const devices = await Device.find(
      req.params.orgId ? { orgId: req.params.orgId } : {}
    );

    const devicesWithLatest = await Promise.all(
      devices.map(async (device) => {
        let latest = {};
        let redisConnected = true;
        let cacheHit = false;

        try {
          latest = await withTimeout(
            redisClient.hGetAll(`device:${device.device_id}:latest`),
            1000
          );

          cacheHit = Object.keys(latest).length > 0;
        } catch (redisError) {
          redisConnected = false;
          cacheHit = false;
          latest = {};
        }

        return {
          ...device.toObject(),

          latestStatus: {
            redisConnected,
            cacheHit,

            lastSeen:
              latest.lastSeen ||
              device.last_seen_at ||
              null,
          },
        };
      })
    );

    res.json(devicesWithLatest);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch devices",
      error: error.message,
    });
  }
};
export const DeviceRegistration = async (req, res) => {
  try {
    const { orgId, name, type, deviceIp } = req.body;

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

    const organization = await Organization.findById(orgId);

    if (!organization) {
      return res.status(404).json({
        message: "Organization not found",
      });
    }

    const existingDeviceIp = await Device.findOne({ deviceIp });

    if (existingDeviceIp) {
      return res.status(400).json({
        message: "Device IP already registered",
      });
    }

    const device_id = uuidv4();

    const arduinoUrl = `http://${deviceIp}/register-device`;

    console.log("Sending REGISTER request to Arduino:");
    console.log({
      url: arduinoUrl,
      device_id,
    });

    const arduinoResult = await callArduino(arduinoUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        device_id,
      }),
    });

    console.log("Arduino REGISTER result:");
    console.log(arduinoResult);

    if (!arduinoResult.ok) {
      return res.status(503).json({
        message:
          "Arduino is not reachable. Please check Arduino power, WiFi, and IP address before adding device.",
        error: arduinoResult.error,
      });
    }

    const result = await Device.create({
      orgId,
      name,
      type,
      deviceIp,
      device_id,
      status: "registered",
      isRunning: false,
      registered_at: new Date(),
    });

    console.log("=================================");
    console.log("[NEW DEVICE REGISTERED]");
    console.log(result);
    console.log("=================================");

    return res.status(201).json({
      message: "Device registered successfully",
      device: result,
    });
  } catch (error) {
    console.error("Device registration error:", error);
    return res.status(500).json({
      message: "Failed to register device",
      error: error.message,
    });
  }
};
export const startDevice = async (req, res) => {
  try {
    const device = await Device.findById(req.params.id);

    if (!device) {
      return res.status(404).json({ message: "Device not found" });
    }

    if (!device.deviceIp) {
      return res.status(400).json({ message: "Device IP is missing" });
    }

    if (device.isRunning) {
      return res.status(400).json({
        message: "Device is already running",
      });
    }

    const arduinoUrl = `http://${device.deviceIp}/start`;

    const arduinoResult = await callArduino(arduinoUrl, {
      method: "POST",
    });

    if (!arduinoResult.ok) {
      device.status = "offline";
      device.isRunning = false;
      await device.save();

      return res.status(503).json({
        message: "Device is offline. Please connect your hardware first.",
        error: arduinoResult.error,
      });
    }

    device.isRunning = true;
    device.status = "online";
    await device.save();

    return res.json({
      message: "Device started successfully",
      device,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to start device",
      error: error.message,
    });
  }
};
export const stopDevice = async (req, res) => {
  try {
    const device = await Device.findById(req.params.id);

    if (!device) {
      return res.status(404).json({ message: "Device not found" });
    }

    if (!device.deviceIp) {
      return res.status(400).json({ message: "Device IP is missing" });
    }

    if (!device.isRunning) {
      device.status = "offline";
      await device.save();

      return res.json({
        message: "Device is already stopped",
        device,
      });
    }

    const arduinoUrl = `http://${device.deviceIp}/stop`;

    const arduinoResult = await callArduino(arduinoUrl, {
      method: "POST",
    });

    if (!arduinoResult.ok) {
      device.status = "offline";
      device.isRunning = false;
      await device.save();

      return res.status(503).json({
        message: "Device is offline. Please connect your hardware first.",
        error: arduinoResult.error,
        device,
      });
    }

    device.isRunning = false;
    device.status = "offline";
    await device.save();

    return res.json({
      message: "Device stopped successfully",
      device,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to stop device",
      error: error.message,
    });
  }
};
export const deviceCheckStatus = async (req, res) => {
    const device = await Device.findOne({ device_id: req.params.deviceId });
    res.json({ isRunning: Boolean(device?.isRunning) });
  };

  const withTimeout = (promise, ms) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Redis timeout")), ms)
    ),
  ]);

// export const getLatestDeviceStatus = async (req, res) => {
//   try {
//     const id = req.params.deviceId;

//     let device = null;

//     if (/^[0-9a-fA-F]{24}$/.test(id)) {
//       device = await Device.findById(id);
//     }

//     if (!device) {
//       device = await Device.findOne({
//         device_id: id,
//       });
//     }

//     if (!device) {
//       return res.status(404).json({
//         message: "Device not found",
//       });
//     }

//     let latest = {};
//     let redisConnected = true;
//     let cacheHit = false;

//     try {
//       latest = await withTimeout(
//         redisClient.hGetAll(`device:${device.device_id}:latest`),
//         1000
//       );

//       cacheHit = Object.keys(latest).length > 0;

//       if (!cacheHit) {
//         console.log("Redis connected but no live data found");
//       }
//     } catch (redisError) {
//       redisConnected = false;
//       cacheHit = false;

//       console.error(
//         "Redis failed or timed out:",
//         redisError.message
//       );

//       latest = {};
//     }

//     return res.json({
//       redisConnected,
//       cacheHit,

//       isRunning: device.isRunning,
//       status: device.status,

//       lastSeen:
//         latest.lastSeen ||
//         device.last_seen_at ||
//         null,

//       latestData: {
//         temperature:
//           latest.temperature ||
//           device.temperature ||
//           null,

//         pressure:
//           latest.pressure ||
//           device.pressure ||
//           null,
//       },
//     });
//   } catch (error) {
//     return res.status(500).json({
//       message: "Failed to get latest device status",
//       error: error.message,
//     });
//   }
// };
  