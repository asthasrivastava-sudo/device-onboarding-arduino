import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

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


export const resetPassword = async (req, res) => {
  const {newPasword}= req.body;
  if (!newPasword) {
    return res.status(400).json({ message: "New password is required" });
  }
    await User.findByIdAndUpdate(req.userId, {
      password: await bcrypt.hash(newPasword, 10),
      mustResetPassword: false,
    });
    res.json({ message: "Password reset successful" });

}
