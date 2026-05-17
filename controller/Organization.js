
import Organization from "../models/Organization.js";
import User from "../models/User.js";
import bcrypt from "bcryptjs";










 export const organizationRegistration =  async (req, res) => {

    try {

      console.log("REQ BODY:", req.body);

      const {
        name,
        location,
        description,
        adminName,
        adminEmail,
        temporaryPassword,
      } = req.body;

      // validation
      if (
        !name ||
        !adminName ||
        !adminEmail ||
        !temporaryPassword
      ) {

        console.log("Validation failed");

        return res.status(400).json({
          message: "Required fields missing",
        });
      }

      // existing user
      const existingUser = await User.findOne({
        email: adminEmail,
      });

      console.log("EXISTING USER:", existingUser);

      if (existingUser) {

        return res.status(400).json({
          message: "Admin email already exists",
        });
      }

      // hash password
      const hashedPassword = await bcrypt.hash(
        temporaryPassword,
        10
      );

      console.log("Password hashed");

      // create admin
      const adminUser = await User.create({

        username: adminName,

        email: adminEmail,

        password: hashedPassword,

        role: "admin",

        mustResetPassword: true,

      });

      console.log("ADMIN USER CREATED:", adminUser);

      // create organization
      const organization = await Organization.create({

        name,
        location,
        description,

        ownerId: adminUser._id,

        createdBy: req.userId,

      });

      console.log("ORGANIZATION CREATED:", organization);

      adminUser.organizationId = organization._id;

      await adminUser.save();

      console.log("ADMIN UPDATED");

      res.status(201).json({
        message: "Organization and admin created",
        organization,
      });

    } catch (error) {

      console.error("FULL ERROR:", error);

      res.status(500).json({
        message: error.message,
      });
    }
  };

 export const ListOrganizations =  async (req, res) => {
    const organizations = await Organization.find();
    res.json(organizations);
  };
  

 
  
export const IndividualOrgById = async (req, res) => {
    const organization = await Organization.findById(req.params.id);
    res.json(organization);
  };