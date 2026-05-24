import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import  sendOtpEmail  from "../config/helper.js";
import redisClient from "../config/redis.js";
import crypto from "crypto";

export const authentication = (req, res) => {
  res.json({
    message: "User is authenticated",
    userId: req.userId,
  });
};


 export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }
    const user = await User.findOne({
      email,
    });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    const token = jwt.sign({ userId: user._id ,  role: user.role,}, "astha", { expiresIn: "1h" });
    res.cookie("token", token, {
  httpOnly: true,
  secure: false,
  sameSite: "lax",
  maxAge: 60 * 60 * 1000,
});

    res.json({ message: "Login successful",user: {
    id: user._id,
    username: user.username,
    email: user.email,
    role: user.role,
    organizationId: user.organizationId,
    mustResetPassword: user.mustResetPassword,
  }, });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};


export const generateOtp = async (req, res) => {
  try {
    const { email } = req.body;
    console.log("Email for OTP generation:", email);

    const user = await User.findOne({ email });
    console.log("User for OTP generation:", user);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const otp = Math.floor(
      100000 + Math.random() * 900000
    ).toString();

    await redisClient.set(`otp:reset:${user._id}`, otp, {
      EX: 60,
    });

    await sendOtpEmail(user.email, otp);

    res.json({
      message: "OTP sent successfully",
      userId: user._id,
    });
  } catch (error) {
    console.error("Send OTP error:", error);

    res.status(500).json({
      message: "Failed to send OTP",
    });
  }
};

export const verifyOtp = async (req, res) => {
  try {
    const { userId, otp } = req.body;

    const savedOtp = await redisClient.get(`otp:reset:${userId}`);

    if (!savedOtp) {
      return res.status(400).json({
        message: "OTP expired",
      });
    }

    if (savedOtp !== otp) {
      return res.status(400).json({
        message: "Invalid OTP",
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");

    await redisClient.set(`reset:token:${resetToken}`, userId, {
      EX: 300,
    });

    await redisClient.del(`otp:reset:${userId}`);

    res.json({
      message: "OTP verified successfully",
      resetToken,
    });
  } catch (error) {
    console.error("OTP verification error:", error);

    res.status(500).json({
      message: "OTP verification failed",
    });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;

    const userId = await redisClient.get(`reset:token:${resetToken}`);

    if (!userId) {
      return res.status(400).json({
        message: "Reset session expired. Please verify OTP again.",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await User.updateOne(
      { _id: userId },
      { password: hashedPassword }
    );

    await redisClient.del(`reset:token:${resetToken}`);

    res.json({
      message: "Password reset successful",
    });
  } catch (error) {
    console.error("Password reset error:", error);

    res.status(500).json({
      message: "Password reset failed",
    });
  }
};
