import bcrypt from "bcryptjs";
import User from "./models/User.js";

export const seedSuperAdmin = async () => {

  try {

    console.log("Checking superadmin...");

    // check existing superadmin
    const existingSuperAdmin = await User.findOne({
      role: "superadmin",
    });

    // already exists
    if (existingSuperAdmin) {

      console.log("Superadmin already exists");

      return;
    }

    // hash password
    const hashedPassword = await bcrypt.hash(
      "SuperAdmin@123",
      10
    );

    // create superadmin
    const superAdmin = await User.create({

      username: "Super Admin",

      email: "superadmin@test.com",

      password: hashedPassword,

      role: "superadmin",

      mustResetPassword: false,

    });

    console.log("=================================");
    console.log("SUPERADMIN CREATED");
    console.log("Email:", superAdmin.email);
    console.log("Password: SuperAdmin@123");
    console.log("=================================");

  } catch (error) {

    console.error(
      "Failed to seed superadmin:",
      error
    );
  }
};