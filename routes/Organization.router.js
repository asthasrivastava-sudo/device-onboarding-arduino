import express from "express";
import{ authMiddleware, superAdminOnly} from "../middleware/auth.js";
import { IndividualOrgById, ListOrganizations, organizationRegistration } from "../controller/Organization.js";

const app = express.Router();

app.post(
  "/admin/organizations",
  authMiddleware,
  superAdminOnly,
  organizationRegistration,
);

app.get("/organizations", authMiddleware, superAdminOnly, ListOrganizations);
app.get("/organizations/:id", authMiddleware,IndividualOrgById);

export default app;
