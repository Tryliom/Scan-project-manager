import dotenv from "dotenv";
import {ScanProjectManager} from "./controllers/ScanProjectManager.mjs";

process.setMaxListeners(20);
dotenv.config();

// Initialize Discord Bot
new ScanProjectManager();