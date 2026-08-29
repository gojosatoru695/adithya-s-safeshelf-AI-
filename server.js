// server.ts
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cors from "cors";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import cron from "node-cron";

// src/lib/db.ts
import mongoose from "mongoose";
var MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.warn("MONGODB_URI not found in environment. Database connection will fail.");
}
var userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  plan: { type: String, default: "free" },
  report_interval: { type: String, default: "none" },
  phone: { type: String },
  role: { type: String, default: "Household User" },
  profile_picture: { type: String },
  preferred_language: { type: String, default: "English" },
  settings: {
    reminderVoiceLanguage: { type: String, default: "English" },
    voiceVolume: { type: Number, default: 80 },
    alarmRepeatCount: { type: Number, default: 3 },
    customReminderMessage: { type: String, default: "Time to take your medicine" },
    enableVoiceAssistant: { type: Boolean, default: true },
    defaultReminderTone: { type: String, default: "soft-alert" },
    notificationsEnabled: { type: Boolean, default: true },
    snoozeDuration: { type: Number, default: 5 },
    repeatIfIgnored: { type: Boolean, default: true },
    autoSaveOcr: { type: Boolean, default: false },
    requireOcrConfirmation: { type: Boolean, default: true },
    showConfidenceScore: { type: Boolean, default: true },
    preferredScanMode: { type: String, default: "package" },
    reportFrequency: { type: String, default: "weekly" },
    exportType: { type: String, default: "PDF" },
    gmailDelivery: { type: Boolean, default: false },
    whatsappSharing: { type: Boolean, default: true },
    sortBy: { type: String, default: "expiry" },
    lowStockThreshold: { type: Number, default: 5 },
    expiryWarningDays: { type: Number, default: 30 },
    preferredRefillPlatform: { type: String, default: "Generic" },
    refillBudget: { type: String, default: "standard" },
    refillReminders: { type: Boolean, default: true }
  }
});
var itemSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  name: { type: String, required: true },
  category: { type: String, required: true },
  quantity: { type: Number, required: true },
  price: { type: Number, default: 0 },
  expiry_date: { type: Date, required: true },
  usage_per_day: { type: Number, default: 1 },
  last_refilled_at: { type: Date },
  created_at: { type: Date, default: Date.now }
});
var reportSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  file_type: { type: String, required: true },
  data_snapshot: { type: String, required: true },
  created_at: { type: Date, default: Date.now }
});
var orderSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  item_id: { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true },
  status: { type: String, required: true },
  address: { type: String, required: true },
  created_at: { type: Date, default: Date.now }
});
var User = mongoose.models.User || mongoose.model("User", userSchema);
var Item = mongoose.models.Item || mongoose.model("Item", itemSchema);
var Report = mongoose.models.Report || mongoose.model("Report", reportSchema);
var Order = mongoose.models.Order || mongoose.model("Order", orderSchema);
var isConnected = false;
async function connectDb() {
  if (isConnected) return;
  if (!MONGODB_URI) {
    console.warn("CRITICAL: MONGODB_URI not found. Reports and historical data will be disabled.");
    return;
  }
  try {
    const options = {
      serverSelectionTimeoutMS: 5e3,
      // Denoted in milliseconds
      socketTimeoutMS: 45e3,
      family: 4
      // Force IPv4 to avoid potential DNS/dual-stack issues in some environments
    };
    await mongoose.connect(MONGODB_URI, options);
    isConnected = true;
    console.log("Connected to MongoDB Successfully");
  } catch (error) {
    console.error("CRITICAL: MongoDB Connection Error Breakdown:");
    if (error instanceof Error) {
      console.error(`- Name: ${error.name}`);
      console.error(`- Message: ${error.message}`);
    }
    console.warn("Proceeding without MongoDB. Some features like historical reports may not work.");
  }
}

// src/lib/smartPlanner.ts
function calculateSmartRefillScores(medicines, monthlyBudget) {
  const recommendations = medicines.map((item) => {
    const usage = item.usagePerDay || 1;
    const depletionDays = item.quantity / usage;
    const urgencyScore = Math.max(0, Math.min(100, (30 - depletionDays) * 3.33));
    const now = /* @__PURE__ */ new Date();
    const expiryDate = item.expiryDate && typeof item.expiryDate.toDate === "function" ? item.expiryDate.toDate() : new Date(item.expiryDate);
    const daysToExpiry = Math.max(0, (expiryDate.getTime() - now.getTime()) / (1e3 * 60 * 60 * 24));
    const expiryRiskScore = Math.max(0, Math.min(100, (30 - daysToExpiry) * 3.33));
    const itemPrice = item.estimatedValue || item.purchasePrice || 0;
    const affordabilityScore = monthlyBudget > 0 ? Math.max(0, Math.min(100, (1 - itemPrice / monthlyBudget) * 100)) : 50;
    let historicalPriorityScore = 50;
    if (item.lastRefilledAt) {
      const lastRefilled = item.lastRefilledAt && typeof item.lastRefilledAt.toDate === "function" ? item.lastRefilledAt.toDate() : new Date(item.lastRefilledAt);
      const daysSinceRefill = (now.getTime() - lastRefilled.getTime()) / (1e3 * 60 * 60 * 24);
      historicalPriorityScore = Math.min(100, daysSinceRefill * 3.33);
    }
    const finalScore = urgencyScore * 0.4 + expiryRiskScore * 0.2 + affordabilityScore * 0.2 + historicalPriorityScore * 0.2;
    let reason = "Stable stock";
    if (urgencyScore > 80 && affordabilityScore > 70) reason = "Low stock + affordable";
    else if (urgencyScore > 80) reason = "Low stock + high usage";
    else if (expiryRiskScore > 80) reason = "Expiring soon";
    else if (affordabilityScore > 80) reason = "Within budget";
    else if (historicalPriorityScore > 80) reason = "Long time since last refill";
    const confidence = Math.min(100, Math.max(50, finalScore + 10));
    return {
      itemId: item.id || "",
      name: item.name,
      category: item.type,
      score: Math.round(finalScore),
      confidence: Math.round(confidence),
      reason,
      price: itemPrice,
      depletionDays: Math.round(depletionDays * 10) / 10
    };
  });
  return recommendations.sort((a, b) => b.score - a.score);
}

// server.ts
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var app = express();
var PORT = 3e3;
var JWT_SECRET = process.env.JWT_SECRET || "fallback_secret";
app.use(cors());
app.use(express.json());
var authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Forbidden" });
    req.user = user;
    next();
  });
};
app.post("/api/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    await connectDb();
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: "User already exists" });
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ name, email, password: hashedPassword });
    await newUser.save();
    const token = jwt.sign({ id: newUser._id, email }, JWT_SECRET);
    res.status(201).json({ token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    await connectDb();
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "Invalid credentials" });
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ error: "Invalid credentials" });
    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET);
    res.json({ token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.get("/api/me", authenticateToken, async (req, res) => {
  try {
    await connectDb();
    const user = await User.findById(req.user?.id).select("-password");
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.post("/api/profile", authenticateToken, async (req, res) => {
  try {
    const { name, phone, role, profile_picture, preferred_language } = req.body;
    await connectDb();
    const user = await User.findByIdAndUpdate(
      req.user?.id,
      { name, phone, role, profile_picture, preferred_language },
      { new: true }
    ).select("-password");
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.post("/api/settings", authenticateToken, async (req, res) => {
  try {
    const { settings } = req.body;
    await connectDb();
    const user = await User.findByIdAndUpdate(
      req.user?.id,
      { settings },
      { new: true }
    ).select("-password");
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.post("/api/auth/firebase", async (req, res) => {
  try {
    const { uid, email, name } = req.body;
    await connectDb();
    let user = await User.findOne({ email });
    if (!user) {
      const dummyPassword = await bcrypt.hash(uid + JWT_SECRET, 10);
      user = new User({
        name: name || email.split("@")[0],
        email,
        password: dummyPassword
      });
      await user.save();
    }
    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET);
    res.json({ token, id: user._id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.post("/api/items", authenticateToken, async (req, res) => {
  try {
    const { name, category, quantity, price, expiry_date, usage_per_day } = req.body;
    await connectDb();
    const newItem = new Item({
      user_id: req.user?.id,
      name,
      category,
      quantity,
      price: price || 0,
      expiry_date: new Date(expiry_date),
      usage_per_day
    });
    await newItem.save();
    res.status(201).json({ id: newItem._id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.get("/api/items", authenticateToken, async (req, res) => {
  try {
    await connectDb();
    const items = await Item.find({ user_id: req.user?.id });
    res.json(items.map((i) => ({
      ...i.toObject(),
      id: i._id,
      expiryDate: i.expiry_date
      // Mapping for frontend consistency if needed
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.put("/api/items/:id", authenticateToken, async (req, res) => {
  try {
    const { name, category, quantity, price, expiry_date, usage_per_day, last_refilled_at } = req.body;
    await connectDb();
    await Item.findOneAndUpdate(
      { _id: req.params.id, user_id: req.user?.id },
      {
        name,
        category,
        quantity,
        price: price || 0,
        expiry_date: new Date(expiry_date),
        usage_per_day,
        last_refilled_at: last_refilled_at ? new Date(last_refilled_at) : void 0
      },
      { new: true }
    );
    res.json({ status: "updated" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.delete("/api/items/:id", authenticateToken, async (req, res) => {
  try {
    await connectDb();
    await Item.deleteOne({ _id: req.params.id, user_id: req.user?.id });
    res.json({ status: "deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.get("/api/smart-refill", authenticateToken, async (req, res) => {
  try {
    const budget = parseFloat(req.query.budget) || 0;
    await connectDb();
    const items = await Item.find({ user_id: req.user?.id });
    const recommendations = calculateSmartRefillScores(items, budget);
    res.json(recommendations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.post("/api/reports/inventory", async (req, res) => {
  try {
    const { items, format } = req.body;
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ error: "Missing or invalid items array" });
    }
    const summary = {
      total: items.length,
      expired: items.filter((i) => {
        const d = i.expiryDate && i.expiryDate.seconds ? new Date(i.expiryDate.seconds * 1e3) : new Date(i.expiryDate);
        return d < /* @__PURE__ */ new Date();
      }).length,
      lowStock: items.filter((i) => i.quantity < 5).length,
      categories: items.reduce((acc, i) => {
        acc[i.type] = (acc[i.type] || 0) + 1;
        return acc;
      }, {}),
      upcomingExpiries: items.filter((i) => {
        const d = i.expiryDate && i.expiryDate.seconds ? new Date(i.expiryDate.seconds * 1e3) : new Date(i.expiryDate);
        const now = /* @__PURE__ */ new Date();
        const diff = d.getTime() - now.getTime();
        return diff > 0 && diff < 1e3 * 60 * 60 * 24 * 7;
      }).length
    };
    if (format === "excel") {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Inventory Report");
      sheet.columns = [
        { header: "ID", key: "id", width: 25 },
        { header: "Name", key: "name", width: 30 },
        { header: "Type", key: "type", width: 15 },
        { header: "Quantity", key: "quantity", width: 12 },
        { header: "Unit", key: "unit", width: 10 },
        { header: "Expiry Date", key: "expiryDateDisp", width: 20 },
        { header: "Risk Score", key: "riskScore", width: 12 }
      ];
      const rows = items.map((item) => ({
        ...item,
        expiryDateDisp: item.expiryDate && item.expiryDate.seconds ? new Date(item.expiryDate.seconds * 1e3).toLocaleDateString() : new Date(item.expiryDate).toLocaleDateString()
      }));
      sheet.addRows(rows);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", "attachment; filename=SafeShelf_Inventory_Report.xlsx");
      await workbook.xlsx.write(res);
      res.end();
    } else if (format === "pdf") {
      const doc = new PDFDocument();
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "attachment; filename=SafeShelf_Inventory_Report.pdf");
      doc.pipe(res);
      doc.fontSize(20).text("SafeShelf AI: Inventory Report", { align: "center" });
      doc.moveDown();
      doc.fontSize(10).text(`Generated on: ${(/* @__PURE__ */ new Date()).toLocaleString()}`, { align: "right" });
      doc.moveDown();
      doc.fontSize(14).text("Executive Summary", { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(11).text(`Total Vault Items: ${summary.total}`);
      doc.fillColor("red").text(`Critical: Expired Items: ${summary.expired}`);
      doc.fillColor("orange").text(`Warning: Low Stock Items: ${summary.lowStock}`);
      doc.fillColor("blue").text(`Caution: Upcoming Expiries (7 days): ${summary.upcomingExpiries}`);
      doc.fillColor("black");
      doc.moveDown();
      doc.fontSize(14).text("Data Visualization: Categories", { underline: true });
      Object.entries(summary.categories).forEach(([cat, count]) => {
        doc.fontSize(11).text(`${cat.charAt(0).toUpperCase() + cat.slice(1)}: ${count}`);
      });
      doc.moveDown();
      doc.fontSize(14).text("Detailed Vault Export", { underline: true });
      doc.moveDown();
      items.forEach((item, index) => {
        const d = item.expiryDate && item.expiryDate.seconds ? new Date(item.expiryDate.seconds * 1e3).toLocaleDateString() : new Date(item.expiryDate).toLocaleDateString();
        doc.fontSize(9).text(`${index + 1}. ${item.name} [${item.type}]`, { continued: true });
        doc.text(` - Qty: ${item.quantity} ${item.unit} | Exp: ${d} | Risk: ${item.riskScore || 0}`);
      });
      doc.end();
    } else {
      res.status(400).json({ error: "Unsupported format" });
    }
  } catch (error) {
    console.error("Report generation error:", error);
    res.status(500).json({ error: error.message });
  }
});
app.get("/api/notifications", (req, res) => {
  res.json([
    { id: 1, type: "warning", message: "Amoxicillin stock is low (5 pills left)", date: (/* @__PURE__ */ new Date()).toISOString() },
    { id: 2, type: "info", message: "Smart Vault sync active", date: (/* @__PURE__ */ new Date()).toISOString() }
  ]);
});
app.get("/api/reports/schedule", authenticateToken, async (req, res) => {
  try {
    await connectDb();
    const user = await User.findById(req.user?.id).select("report_interval");
    res.json({ schedule: user?.report_interval || "none" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.post("/api/reports/schedule", authenticateToken, async (req, res) => {
  try {
    const { interval } = req.body;
    await connectDb();
    await User.findByIdAndUpdate(req.user?.id, { report_interval: interval }, { new: true });
    res.json({ status: "scheduled", interval });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.get("/api/reports/history", authenticateToken, async (req, res) => {
  try {
    await connectDb();
    const history = await Report.find({ user_id: req.user?.id }).sort({ created_at: -1 }).select("id file_type created_at");
    res.json(history.map((r) => ({ ...r.toObject(), id: r._id })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.get("/api/reports/download/:id", authenticateToken, async (req, res) => {
  try {
    await connectDb();
    const report = await Report.findOne({ _id: req.params.id, user_id: req.user?.id });
    if (!report) return res.status(404).json({ error: "Report not found" });
    const items = JSON.parse(report.data_snapshot);
    const format = report.file_type;
    const summary = {
      total: items.length,
      expired: items.filter((i) => {
        const d = i.expiryDate && i.expiryDate.seconds ? new Date(i.expiryDate.seconds * 1e3) : new Date(i.expiryDate);
        return d < new Date(report.created_at);
      }).length,
      lowStock: items.filter((i) => i.quantity < 5).length,
      categories: items.reduce((acc, i) => {
        acc[i.type || i.category] = (acc[i.type || i.category] || 0) + 1;
        return acc;
      }, {}),
      upcomingExpiries: items.filter((i) => {
        const d = i.expiryDate && i.expiryDate.seconds ? new Date(i.expiryDate.seconds * 1e3) : new Date(i.expiryDate);
        const ref = new Date(report.created_at);
        const diff = d.getTime() - ref.getTime();
        return diff > 0 && diff < 1e3 * 60 * 60 * 24 * 7;
      }).length
    };
    if (format === "excel") {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Inventory Report");
      sheet.columns = [
        { header: "ID", key: "id", width: 25 },
        { header: "Name", key: "name", width: 30 },
        { header: "Type", key: "type", width: 15 },
        { header: "Quantity", key: "quantity", width: 12 },
        { header: "Unit", key: "unit", width: 10 },
        { header: "Expiry Date", key: "expiryDateDisp", width: 20 },
        { header: "Risk Score", key: "riskScore", width: 12 }
      ];
      const rows = items.map((item) => ({
        ...item,
        type: item.type || item.category,
        expiryDateDisp: item.expiryDate && item.expiryDate.seconds ? new Date(item.expiryDate.seconds * 1e3).toLocaleDateString() : new Date(item.expiryDate).toLocaleDateString()
      }));
      sheet.addRows(rows);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename=SafeShelf_Historical_Report_${report.id}.xlsx`);
      await workbook.xlsx.write(res);
      res.end();
    } else {
      const doc = new PDFDocument();
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename=SafeShelf_Historical_Report_${report.id}.pdf`);
      doc.pipe(res);
      doc.fontSize(20).text("SafeShelf AI: Historical Report", { align: "center" });
      doc.moveDown();
      doc.fontSize(10).text(`Archived on: ${new Date(report.created_at).toLocaleString()}`, { align: "right" });
      doc.moveDown();
      doc.fontSize(14).text("Executive Summary", { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(11).text(`Total Vault Items: ${summary.total}`);
      doc.text(`Expired Items (at time): ${summary.expired}`);
      doc.text(`Low Stock Items: ${summary.lowStock}`);
      doc.moveDown();
      doc.fontSize(14).text("Detailed Vault Export", { underline: true });
      doc.moveDown();
      items.forEach((item, index) => {
        const d = item.expiryDate && item.expiryDate.seconds ? new Date(item.expiryDate.seconds * 1e3).toLocaleDateString() : new Date(item.expiryDate).toLocaleDateString();
        doc.fontSize(9).text(`${index + 1}. ${item.name} [${item.type || item.category}] - Qty: ${item.quantity} | Exp: ${d}`);
      });
      doc.end();
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", database: "mongodb" });
});
var startCronJobs = () => {
  cron.schedule("0 * * * *", async () => {
    console.log("Running Scheduled Report Check...");
    try {
      await connectDb();
      const users = await User.find({ report_interval: { $ne: "none" } });
      const now = /* @__PURE__ */ new Date();
      for (const user of users) {
        let shouldRun = false;
        if (user.report_interval === "daily") {
          shouldRun = true;
        } else if (user.report_interval === "weekly" && now.getDay() === 0) {
          shouldRun = true;
        } else if (user.report_interval === "monthly" && now.getDate() === 1) {
          shouldRun = true;
        }
        if (shouldRun) {
          console.log(`Generating scheduled report for user ${user._id} (${user.email})`);
          const items = await Item.find({ user_id: user._id });
          const newReport = new Report({
            user_id: user._id,
            file_type: "pdf",
            data_snapshot: JSON.stringify(items)
          });
          await newReport.save();
        }
      }
    } catch (err) {
      console.error("Cron job error:", err);
    }
  });
};
async function startServer() {
  await connectDb();
  startCronJobs();
  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: `API route ${req.method} ${req.url} not found` });
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        watch: null
      },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
  }
  if (process.env.NODE_ENV === "production") {
    const distPath = path.join(process.cwd(), "dist");
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}
startServer();
