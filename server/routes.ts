import type { Express } from "express";
import { isAuthenticated } from "./replit_integrations/auth/index.js";
import { storage } from "./storage.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, "..", "data");
const SUBMISSIONS_FILE = path.join(DATA_DIR, "submissions.json");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function saveToJsonFile(form: any) {
  ensureDataDir();

  let submissions: any[] = [];
  if (fs.existsSync(SUBMISSIONS_FILE)) {
    try {
      const raw = fs.readFileSync(SUBMISSIONS_FILE, "utf-8");
      submissions = JSON.parse(raw);
    } catch {
      submissions = [];
    }
  }

  const existingIndex = submissions.findIndex((s: any) => s.id === form.id);
  const entry = {
    ...form,
    savedAt: new Date().toISOString(),
  };

  if (existingIndex >= 0) {
    submissions[existingIndex] = entry;
  } else {
    submissions.push(entry);
  }

  fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify(submissions, null, 2), "utf-8");
}

export function registerFormRoutes(app: Express) {
  app.post("/api/forms", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const form = await storage.createForm({
        ...req.body,
        userId,
      });
      saveToJsonFile(form);
      res.json(form);
    } catch (error) {
      console.error("Error creating form:", error);
      res.status(500).json({ error: "Failed to create form" });
    }
  });

  app.get("/api/forms", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const forms = await storage.getFormsByUser(userId);
      res.json(forms);
    } catch (error) {
      console.error("Error fetching forms:", error);
      res.status(500).json({ error: "Failed to fetch forms" });
    }
  });

  app.get("/api/forms/:id", isAuthenticated, async (req: any, res) => {
    try {
      const form = await storage.getForm(parseInt(req.params.id));
      if (!form) {
        return res.status(404).json({ error: "Form not found" });
      }
      res.json(form);
    } catch (error) {
      console.error("Error fetching form:", error);
      res.status(500).json({ error: "Failed to fetch form" });
    }
  });

  app.put("/api/forms/:id", isAuthenticated, async (req: any, res) => {
    try {
      const form = await storage.updateForm(parseInt(req.params.id), req.body);
      if (!form) {
        return res.status(404).json({ error: "Form not found" });
      }
      saveToJsonFile(form);
      res.json(form);
    } catch (error) {
      console.error("Error updating form:", error);
      res.status(500).json({ error: "Failed to update form" });
    }
  });

  app.get("/api/export/json", isAuthenticated, async (_req: any, res) => {
    try {
      if (fs.existsSync(SUBMISSIONS_FILE)) {
        const raw = fs.readFileSync(SUBMISSIONS_FILE, "utf-8");
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Content-Disposition", "attachment; filename=submissions.json");
        res.send(raw);
      } else {
        res.json([]);
      }
    } catch (error) {
      console.error("Error exporting JSON:", error);
      res.status(500).json({ error: "Failed to export data" });
    }
  });
}
