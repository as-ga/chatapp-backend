import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import { corsOptions } from "./constants.js";
import userRoute from "./routes/user.routes.js";
import chatRoute from "./routes/chat.routes.js";
import adminRoute from "./routes/admin.routes.js";

const app = express();

const adminSecretKey = process.env.ADMIN_SECRET_KEY || "adsasdsdfsdfsdfd";

app.use(cors(corsOptions));
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());
// Using Middlewares Here
app.use("/api/v1/user", userRoute);
app.use("/api/v1/chat", chatRoute);
app.use("/api/v1/admin", adminRoute);

app.get("/", (req, res) => {
  res.send("Gaurav Chat App");
});

export { app, adminSecretKey };
