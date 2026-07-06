import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import studentRouter from "./routes/student.routes";
import schoolRouter from "./routes/school.routes";
import feeRecordsRouter from "./routes/fee-records.routes";

const app = express();

const allowedOrigins =
  process.env.FRONTEND_URLS?.split(",").map(origin => origin.trim()) ||
  [process.env.FRONTEND_URL].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow Postman, curl, server-to-server requests
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

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
app.use('/schools', schoolRouter);
app.use('/fee-records', feeRecordsRouter);

export default app;
