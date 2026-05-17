import express from "express";
import {authMiddleware} from "../middleware/auth.js";
import {  sensorDataStream } from "../controller/Sensor.js";

const app = express.Router();

app.post("/sensor-data", sensorDataStream);






export default app;