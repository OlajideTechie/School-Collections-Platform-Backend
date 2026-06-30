import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import studentRouter from "./routes/student.routes";

const app = express();

app.use(cors());
app.use(helmet());
app.use(compression());
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan("dev"));
}
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

// API Routes
app.use('/students', studentRouter);

export default app;
