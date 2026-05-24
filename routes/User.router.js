import express from "express";
import {authMiddleware} from "../middleware/auth.js";
import { authentication, login, resetPassword, generateOtp, verifyOtp } from "../controller/User.js";
const app = express.Router();



app.get("/me", authMiddleware, authentication);
app.post("/login", login);
// app.post("/reset-password", authMiddleware, resetPassword);
app.post("/auth/forgot-password/send-otp", generateOtp);
app.post("/auth/forgot-password/verify-otp", verifyOtp);
app.post("/auth/forgot-password/reset-password", resetPassword);


export default app;