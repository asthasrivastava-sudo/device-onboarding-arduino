import express from "express";
import {authMiddleware} from "../middleware/auth.js";
import { authentication, login, resetPassword } from "../controller/User.js";
const app = express.Router();



app.get("/me", authMiddleware, authentication);
app.post("/login", login);
app.post("/reset-password", authMiddleware, resetPassword);


export default app;