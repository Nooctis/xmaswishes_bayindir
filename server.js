// server.js
require("dotenv").config(); // Laden der Umgebungsvariablen

const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");
const winston = require("winston");
const rateLimit = require("express-rate-limit");
const morgan = require("morgan");
const fs = require("fs");
const path = require("path");

// Winston-Logger konfigurieren
const logger = winston.createLogger({
  level: "error",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: "server.log" }),
    new winston.transports.Console(),
  ],
});

// Verbindung zur MongoDB herstellen
mongoose
  .connect(process.env.MONGODB_URI, {
    maxPoolSize: 40, // Verbindungspoolgröße erhöhen
  })
  .then(() => console.log("MongoDB verbunden"))
  .catch((err) => {
    logger.error(`MongoDB Verbindung fehlgeschlagen: ${err.message}`);
    process.exit(1);
  });

// Definieren des Wish-Schemas und Modells
const wishSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  wish: { type: String, required: true },
  status: {
    type: Number,
    enum: [1, 2, 3, 4],
    default: 1,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Wish = mongoose.model("Wish", wishSchema);

// Express-App einrichten
const app = express();
app.use(bodyParser.json());
app.use(cors());

// Morgan-HTTP-Logger einrichten
const accessLogStream = fs.createWriteStream(
  path.join(__dirname, "access.log"),
  { flags: "a" }
);
app.use(morgan("combined", { stream: accessLogStream }));
app.use(morgan("dev")); // Zusätzlich in der Konsole anzeigen

// Rate Limiter temporär deaktiviert:
/*
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 Minuten
    max: 1000, // Maximal 1000 Anfragen pro IP
    message: 'Zu viele Anfragen von dieser IP, bitte versuchen Sie es später erneut.'
});
app.use('/api/', apiLimiter);
*/

// Endpunkt zum Einreichen eines Wunsches (POST)
app.post("/api/wishes", async (req, res) => {
  console.log(req.body);
  const { name, wish } = req.body;
  if (!name || !wish) {
    logger.error("POST /api/wishes - Fehlende Felder: Name oder Wunsch");
    return res
      .status(400)
      .json({ message: "Name und Wunsch sind erforderlich." });
  }
  try {
    const newWish = new Wish({ name, wish });
    await newWish.save();
    res.status(201).json(newWish);
  } catch (error) {
    logger.error(`POST /api/wishes - Fehler beim Speichern: ${error.message}`);
    res.status(500).json({ message: "Fehler beim Speichern des Wunsches." });
  }
});

// Endpunkt zum Abrufen aller Wünsche (GET)
app.get("/api/wishes", async (req, res) => {
  try {
    const wishes = await Wish.find();
    res.status(200).json(wishes);
  } catch (error) {
    logger.error(`GET /api/wishes - Fehler beim Abrufen: ${error.message}`);
    res.status(500).json({ message: "Fehler beim Abrufen der Wünsche." });
  }
});

// Health-Check-Endpunkt
app.get("/health", async (req, res) => {
  try {
    await mongoose.connection.db.admin().ping();
    res.status(200).json({ status: "OK" });
  } catch (error) {
    logger.error(`GET /health - Datenbank nicht erreichbar: ${error.message}`);
    res.status(500).json({ status: "FAIL", error: error.message });
  }
});

// Unhandled Rejection Handler
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at:", promise, "reason:", reason);
});

// Uncaught Exception Handler
process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception:", error);
});

// Server starten
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server läuft auf Port ${PORT}`);
  logger.info(`Server läuft auf Port ${PORT}`);
});
