import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { crmRouter } from "./routes/crmRoutes.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { checkDbConnection } from "./db.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Mount CRM API Routes
app.use("/api", crmRouter);

// Global Error Handler
app.use(errorHandler);

async function start() {
  const dbStatus = await checkDbConnection();
  console.log(`[Database Setup] ${dbStatus.message}`);

  app.listen(PORT, () => {
    console.log(`🚀 GBK CRM Backend Service listening on port ${PORT}`);
    console.log(`🔗 Health check available at http://localhost:${PORT}/api/health`);
  });
}

start();
