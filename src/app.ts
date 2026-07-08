import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import studentRouter from "./routes/student.routes";
import schoolRouter from "./routes/school.routes";
import feeRecordsRouter from "./routes/fee-records.routes";
import paymentRouter from "./routes/payments.routes";
import { startPaymentVerificationJob } from "./jobs/paymentVerification.job";

const app = express();

const allowedOrigins = (
  process.env.FRONTEND_URLS ?? ""
)
  .split(",")
  .map(origin => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      console.log("Origin:", origin);

      // Allow Postman, curl, Swagger on same origin
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.error("Blocked CORS Origin:", origin);

      callback(null, false);
    },
    credentials: true,
  })
);

app.use(helmet());
app.use(compression());
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan("dev"));
}
app.use(
  express.json({
    verify: (req, _res, buffer) => {
      (req as express.Request & { rawBody?: Buffer }).rawBody =
        Buffer.from(buffer);
    },
  })
);

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
app.use('/payments', paymentRouter);

startPaymentVerificationJob();

export default app;

