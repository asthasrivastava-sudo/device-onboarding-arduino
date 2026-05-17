import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import cookie from "cookie-parser";
import { seedSuperAdmin } from "./SeedSuperAdmin.js";
import net from "net";
import userRoutes from "./routes/User.router.js";
import organizationRoutes from "./routes/Organization.router.js";
import deviceRoutes from "./routes/Device.router.js";
import sensorRoutes from "./routes/Sensor.router.js";
const app = express();
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true,
}));
app.use(express.json());
app.use(cookie());
app.use(userRoutes);
app.use(organizationRoutes);
app.use(deviceRoutes);
app.use(sensorRoutes);
app.get("/", (req, res) => {
  res.send("Backend reachable");
});

mongoose
  .connect(
    "mongodb+srv://asthasrivastava:Astha123@cluster0.iofaprn.mongodb.net/?appName=Cluster0",
    {},
  )
  .then(async() => {
    app.listen(8000, "0.0.0.0", () => {
      console.log("Server is running on port 8000");
    });
    console.log("Connected to MongoDB");
     await seedSuperAdmin();
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB", err);
  });
