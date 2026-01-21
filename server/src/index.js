import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import database
import pool from './config/db.js';

// Import routes
import authRoutes from './routes/auth.js';
import organizationRoutes from './routes/organizations.js';
import plugRoutes from './routes/plugs.js';
import employeeRoutes from './routes/employees.js';
import departmentRoutes from './routes/departments.js';
import inviteRoutes from './routes/invites.js';
import attendanceRoutes from './routes/attendance.js';
import payrollRoutes from './routes/payroll.js';
import documentRoutes from './routes/documents.js';
import notificationRoutes from './routes/notifications.js';

// Import Plugin SDK
import { PluginManager } from './sdk/index.js';
import { createPluginAdminRoutes } from './routes/pluginAdmin.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Increased for base64 file uploads

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Built-in routes
app.use('/api/auth', authRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/plugs', plugRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/invites', inviteRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/notifications', notificationRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Initialize Plugin System and start server
async function startServer() {
  try {
    // Initialize Plugin Manager
    const pluginManager = new PluginManager(app, pool);
    await pluginManager.initialize();

    // Mount plugin admin routes
    app.use('/api/admin/plugins', createPluginAdminRoutes(pluginManager));

    // Store plugin manager on app for access in other routes if needed
    app.set('pluginManager', pluginManager);

    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 PlugOS server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
