import dotenv from "dotenv";
dotenv.config();

import app from './app'; 
import { setupSwagger } from './swagger';

const PORT = process.env.PORT || 5000;

// Integrate Swagger
setupSwagger(app);

app.listen(PORT, () => {
  console.log(`🚀 API running on http://localhost:${PORT}`);
});