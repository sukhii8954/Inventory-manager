import express, { json } from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

import itemsRouter from "./routes/items.js";

const app  = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: ["http://127.0.0.1:5500", "http://localhost:5500", "http://localhost:3000"],
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type"]
}));

app.use(json());

app.use("/api/items", itemsRouter);

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "InvenTrack API is running!",
    endpoints: {
      getAllItems:  "GET    /api/items",
      getTypes:    "GET    /api/items/types",
      createItems: "POST   /api/items",
      updateItem:  "PUT    /api/items/:id",
      deleteItem:  "DELETE /api/items/:id"
    }
  });
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.url} not found` });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});