import express from 'express';
import cors from 'cors';
import path from 'path';
import { QuickDB } from 'quick.db';

const app = express();
const port = process.env.PORT || 2469;

app.use(cors());
app.use(express.json());

// Initialize QuickDB
const db = new QuickDB();

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Example Sync Route
app.post('/api/sync', async (req, res) => {
  const { userId, data } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }
  await db.set(`user_${userId}`, data);
  res.json({ success: true });
});

app.get('/api/sync/:userId', async (req, res) => {
  const { userId } = req.params;
  const data = await db.get(`user_${userId}`);
  res.json({ data: data || null });
});

// Serve the Vite Client in production
const clientDistPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientDistPath));

// Fallback to index.html for SPA routing
app.use((req, res, next) => {
  if (req.method === 'GET' && req.accepts('html')) {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  } else {
    next();
  }
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
