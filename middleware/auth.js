import jwt from "jsonwebtoken";

export const authMiddleware = (req, res, next) => {
  try {
    const token = req.cookies?.token;

    if (!token) {
      return res.status(401).json({
        message: "Unauthorized: No token found",
      });
    }

    const decoded = jwt.verify(token, "astha");

    req.userId = decoded.userId;
    req.userRole = decoded.role;

    next();
  } catch (error) {
    console.error("Auth middleware error:", error.message);

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        message: "Session expired. Please login again",
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        message: "Invalid token. Please login again",
      });
    }

    return res.status(401).json({
      message: "Unauthorized access",
    });
  }
};
 export const superAdminOnly = (req, res, next) => {

  if (req.userRole !== "superadmin") {
    return res.status(403).json({
      message: "Superadmin only",
    });
  }

  next();
};

// export default authMiddleware;