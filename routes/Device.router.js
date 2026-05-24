import express from "express";
import {authMiddleware} from "../middleware/auth.js";
import { OrganizationSpecificDevices, DeviceRegistration, startDevice, stopDevice, deviceCheckStatus } from "../controller/Device.js";
const app = express.Router();

app.get("/organizations/:orgId/devices", authMiddleware, OrganizationSpecificDevices);
app.post("/devices", authMiddleware, DeviceRegistration);
app.post("/devices/:id/start", authMiddleware, startDevice);
// app.get("/devices/:deviceId/latest/status", authMiddleware, getLatestDeviceStatus);
app.post("/devices/:id/stop", authMiddleware, stopDevice);
app.get("/devices/:deviceId/command", authMiddleware, deviceCheckStatus);



export default app;