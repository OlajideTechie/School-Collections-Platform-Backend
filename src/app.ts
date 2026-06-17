import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";

const app = express();

app.use(cors());
app.use(helmet());
app.use(compression());
app.use(morgan("dev"));
app.use(express.json());

// Root endpoint upon accessing the API
app.get("/", (_, res) => {
  res.json({
    project: "School Collections Platform",
    version: "1.0.0",
    status: "Running 🚀",
  });
});

// Health check endpoint
app.get("/health", (_, res) => {
  res.status(200).json({
    success: true,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

export default app;