import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import cron from 'node-cron';
import { User, Item, Report, connectDb } from './src/lib/db.ts';
import { calculateSmartRefillScores } from './src/lib/smartPlanner.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

app.use(cors());
app.use(express.json());

// Auth Middleware
interface AuthRequest extends Request {
  user?: { id: string; email: string };
}

const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: 'Forbidden' });
    req.user = user;
    next();
  });
};

// --- AUTH APIs ---

app.post('/api/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    await connectDb();
    
    // Check if user exists
    const existingUser = await (User as any).findOne({ email });
    if (existingUser) return res.status(400).json({ error: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ name, email, password: hashedPassword });
    await newUser.save();

    const token = jwt.sign({ id: newUser._id, email }, JWT_SECRET);
    res.status(201).json({ token });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    await connectDb();
    
    const user = await (User as any).findOne({ email });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET);
    res.json({ token });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/me', authenticateToken, async (req: AuthRequest, res) => {
  try {
    await connectDb();
    const user = await (User as any).findById(req.user?.id).select('id name email plan report_interval');
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- ITEMS APIs ---

app.post('/api/items', authenticateToken, async (req: AuthRequest, res) => {
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
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/items', authenticateToken, async (req: AuthRequest, res) => {
  try {
    await connectDb();
    const items = await (Item as any).find({ user_id: req.user?.id });
    res.json(items.map(i => ({
      ...i.toObject(),
      id: i._id,
      expiryDate: i.expiry_date // Mapping for frontend consistency if needed
    })));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/items/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { name, category, quantity, price, expiry_date, usage_per_day, last_refilled_at } = req.body;
    await connectDb();
    
    await (Item as any).findOneAndUpdate(
      { _id: req.params.id, user_id: req.user?.id },
      { 
        name, 
        category, 
        quantity, 
        price: price || 0,
        expiry_date: new Date(expiry_date), 
        usage_per_day,
        last_refilled_at: last_refilled_at ? new Date(last_refilled_at) : undefined
      },
      { new: true }
    );
    
    res.json({ status: 'updated' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/items/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    await connectDb();
    await Item.deleteOne({ _id: req.params.id, user_id: req.user?.id });
    res.json({ status: 'deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/smart-refill', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const budget = parseFloat(req.query.budget as string) || 0;
    await connectDb();
    const items = await (Item as any).find({ user_id: req.user?.id });
    const recommendations = calculateSmartRefillScores(items, budget);
    res.json(recommendations);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- HEALTH & MOCK & REPORTS ---
app.post('/api/reports/inventory', async (req, res) => {
  try {
    const { items, format } = req.body;
    
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ error: 'Missing or invalid items array' });
    }

    const summary = {
      total: items.length,
      expired: items.filter(i => {
        const d = i.expiryDate && i.expiryDate.seconds 
          ? new Date(i.expiryDate.seconds * 1000)
          : new Date(i.expiryDate);
        return d < new Date();
      }).length,
      lowStock: items.filter(i => i.quantity < 5).length,
      categories: items.reduce((acc: any, i) => {
        acc[i.type] = (acc[i.type] || 0) + 1;
        return acc;
      }, {}),
      upcomingExpiries: items.filter(i => {
        const d = i.expiryDate && i.expiryDate.seconds 
          ? new Date(i.expiryDate.seconds * 1000)
          : new Date(i.expiryDate);
        const now = new Date();
        const diff = d.getTime() - now.getTime();
        return diff > 0 && diff < (1000 * 60 * 60 * 24 * 7);
      }).length
    };

    if (format === 'excel') {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Inventory Report');
      
      sheet.columns = [
        { header: 'ID', key: 'id', width: 25 },
        { header: 'Name', key: 'name', width: 30 },
        { header: 'Type', key: 'type', width: 15 },
        { header: 'Quantity', key: 'quantity', width: 12 },
        { header: 'Unit', key: 'unit', width: 10 },
        { header: 'Expiry Date', key: 'expiryDateDisp', width: 20 },
        { header: 'Risk Score', key: 'riskScore', width: 12 }
      ];

      const rows = items.map(item => ({
        ...item,
        expiryDateDisp: item.expiryDate && item.expiryDate.seconds 
          ? new Date(item.expiryDate.seconds * 1000).toLocaleDateString()
          : new Date(item.expiryDate).toLocaleDateString()
      }));

      sheet.addRows(rows);

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=SafeShelf_Inventory_Report.xlsx');
      
      await workbook.xlsx.write(res);
      res.end();
    } else if (format === 'pdf') {
      const doc = new PDFDocument();
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=SafeShelf_Inventory_Report.pdf');
      
      doc.pipe(res);
      
      doc.fontSize(20).text('SafeShelf AI: Inventory Report', { align: 'center' });
      doc.moveDown();
      doc.fontSize(10).text(`Generated on: ${new Date().toLocaleString()}`, { align: 'right' });
      doc.moveDown();
      
      doc.fontSize(14).text('Executive Summary', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(11).text(`Total Vault Items: ${summary.total}`);
      doc.fillColor('red').text(`Critical: Expired Items: ${summary.expired}`);
      doc.fillColor('orange').text(`Warning: Low Stock Items: ${summary.lowStock}`);
      doc.fillColor('blue').text(`Caution: Upcoming Expiries (7 days): ${summary.upcomingExpiries}`);
      doc.fillColor('black');
      doc.moveDown();
      
      doc.fontSize(14).text('Data Visualization: Categories', { underline: true });
      Object.entries(summary.categories).forEach(([cat, count]) => {
        doc.fontSize(11).text(`${cat.charAt(0).toUpperCase() + cat.slice(1)}: ${count}`);
      });
      doc.moveDown();
      
      doc.fontSize(14).text('Detailed Vault Export', { underline: true });
      doc.moveDown();
      
      items.forEach((item, index) => {
        const d = item.expiryDate && item.expiryDate.seconds 
          ? new Date(item.expiryDate.seconds * 1000).toLocaleDateString()
          : new Date(item.expiryDate).toLocaleDateString();
        
        doc.fontSize(9).text(`${index + 1}. ${item.name} [${item.type}]`, { continued: true });
        doc.text(` - Qty: ${item.quantity} ${item.unit} | Exp: ${d} | Risk: ${item.riskScore || 0}`);
      });
      
      doc.end();
    } else {
      res.status(400).json({ error: 'Unsupported format' });
    }
  } catch (error: any) {
    console.error('Report generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/notifications', (req, res) => {
  res.json([
    { id: 1, type: 'warning', message: 'Amoxicillin stock is low (5 pills left)', date: new Date().toISOString() },
    { id: 2, type: 'info', message: 'Smart Vault sync active', date: new Date().toISOString() }
  ]);
});

// --- REPORT SCHEDULING & HISTORY ---

app.post('/api/reports/schedule', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { interval } = req.body; // 'daily', 'weekly', 'monthly', 'none'
    await connectDb();
    await (User as any).findByIdAndUpdate(req.user?.id, { report_interval: interval }, { new: true });
    res.json({ status: 'scheduled', interval });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/reports/history', authenticateToken, async (req: AuthRequest, res) => {
  try {
    await connectDb();
    const history = await (Report as any).find({ user_id: req.user?.id }).sort({ created_at: -1 }).select('id file_type created_at');
    res.json(history.map(r => ({ ...r.toObject(), id: r._id })));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/reports/download/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    await connectDb();
    const report = await (Report as any).findOne({ _id: req.params.id, user_id: req.user?.id });
    if (!report) return res.status(404).json({ error: 'Report not found' });

    const items = JSON.parse(report.data_snapshot);
    const format = report.file_type;
    
    // Reuse the same logic from /api/reports/inventory (I'll extract it later if needed, but for now I'll duplicate or call internal helper)
    // For brevity in this edit, I'll assume we can use the main inventory report logic but with snapshot items
    // I'll refactor the /api/reports/inventory slightly to use a helper function or just copy logic here.
    
    // Abstracted helper or copied logic here...
    // Let's actually refactor /api/reports/inventory to a reusable function if possible, 
    // but edit_file is better for small changes. I'll just copy the logic for now to ensure it works.
    
    const summary = {
      total: items.length,
      expired: items.filter((i: any) => {
        const d = i.expiryDate && i.expiryDate.seconds 
          ? new Date(i.expiryDate.seconds * 1000)
          : new Date(i.expiryDate);
        return d < new Date(report.created_at); // Comparison relative to when report was made
      }).length,
      lowStock: items.filter((i: any) => i.quantity < 5).length,
      categories: items.reduce((acc: any, i: any) => {
        acc[i.type || i.category] = (acc[i.type || i.category] || 0) + 1;
        return acc;
      }, {}),
      upcomingExpiries: items.filter((i: any) => {
        const d = i.expiryDate && i.expiryDate.seconds 
          ? new Date(i.expiryDate.seconds * 1000)
          : new Date(i.expiryDate);
        const ref = new Date(report.created_at);
        const diff = d.getTime() - ref.getTime();
        return diff > 0 && diff < (1000 * 60 * 60 * 24 * 7);
      }).length
    };

    if (format === 'excel') {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Inventory Report');
      sheet.columns = [
        { header: 'ID', key: 'id', width: 25 },
        { header: 'Name', key: 'name', width: 30 },
        { header: 'Type', key: 'type', width: 15 },
        { header: 'Quantity', key: 'quantity', width: 12 },
        { header: 'Unit', key: 'unit', width: 10 },
        { header: 'Expiry Date', key: 'expiryDateDisp', width: 20 },
        { header: 'Risk Score', key: 'riskScore', width: 12 }
      ];
      const rows = items.map((item: any) => ({
        ...item,
        type: item.type || item.category,
        expiryDateDisp: item.expiryDate && item.expiryDate.seconds 
          ? new Date(item.expiryDate.seconds * 1000).toLocaleDateString()
          : new Date(item.expiryDate).toLocaleDateString()
      }));
      sheet.addRows(rows);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=SafeShelf_Historical_Report_${report.id}.xlsx`);
      await workbook.xlsx.write(res);
      res.end();
    } else {
      const doc = new PDFDocument();
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=SafeShelf_Historical_Report_${report.id}.pdf`);
      doc.pipe(res);
      doc.fontSize(20).text('SafeShelf AI: Historical Report', { align: 'center' });
      doc.moveDown();
      doc.fontSize(10).text(`Archived on: ${new Date(report.created_at).toLocaleString()}`, { align: 'right' });
      doc.moveDown();
      doc.fontSize(14).text('Executive Summary', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(11).text(`Total Vault Items: ${summary.total}`);
      doc.text(`Expired Items (at time): ${summary.expired}`);
      doc.text(`Low Stock Items: ${summary.lowStock}`);
      doc.moveDown();
      doc.fontSize(14).text('Detailed Vault Export', { underline: true });
      doc.moveDown();
      items.forEach((item: any, index: number) => {
        const d = item.expiryDate && item.expiryDate.seconds 
          ? new Date(item.expiryDate.seconds * 1000).toLocaleDateString()
          : new Date(item.expiryDate).toLocaleDateString();
        doc.fontSize(9).text(`${index + 1}. ${item.name} [${item.type || item.category}] - Qty: ${item.quantity} | Exp: ${d}`);
      });
      doc.end();
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', database: 'mongodb' });
});

// --- CRON WORKER ---
const startCronJobs = () => {
  cron.schedule('0 * * * *', async () => {
    console.log('Running Scheduled Report Check...');
    try {
      await connectDb();
      const users = await (User as any).find({ report_interval: { $ne: 'none' } });
      
      const now = new Date();
      
      for (const user of users) {
        let shouldRun = false;
        if (user.report_interval === 'daily') {
          shouldRun = true;
        } else if (user.report_interval === 'weekly' && now.getDay() === 0) {
          shouldRun = true;
        } else if (user.report_interval === 'monthly' && now.getDate() === 1) {
          shouldRun = true;
        }

        if (shouldRun) {
          console.log(`Generating scheduled report for user ${user._id} (${user.email})`);
          const items = await (Item as any).find({ user_id: user._id });
          const newReport = new Report({
            user_id: user._id,
            file_type: 'pdf',
            data_snapshot: JSON.stringify(items)
          });
          await newReport.save();
        }
      }
    } catch (err) {
      console.error('Cron job error:', err);
    }
  });
};

// Vite & Static setup
async function startServer() {
  await connectDb();
  startCronJobs();
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: false,
        watch: null,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.all('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
