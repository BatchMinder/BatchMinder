import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/authRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import curriculumRoutes from './routes/curriculumRoutes.js';
import userRoutes from './routes/userRoutes.js';
import departmentRoutes from './routes/departmentRoutes.js';
import batchRoutes from './routes/batchRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import migrationRoutes from './routes/migrationRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import auditLogRoutes from './routes/auditLogRoutes.js';
import advisorRoutes from './routes/advisorRoutes.js';
import hodRoutes from './routes/hodRoutes.js';
import schedulingRoutes from './routes/schedulingRoutes.js';
import connectDB from './utils/db.js';

const dotenvResult = dotenv.config();
console.log('[DEBUG] dotenv load result:', dotenvResult.error ? 'Error: ' + dotenvResult.error.message : 'Success');
console.log('[DEBUG] process.env.RESEND_API_KEY loaded:', process.env.RESEND_API_KEY ? 'Yes (starts with ' + process.env.RESEND_API_KEY.substring(0, 7) + '...)' : 'No');



const app = express();
const PORT = process.env.PORT || 5000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json());

connectDB();

app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/curriculum', curriculumRoutes);
app.use('/api/curriculums', curriculumRoutes);
app.use('/api/users', userRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/batches', batchRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/migrations', migrationRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/auth/audit-logs', auditLogRoutes);
app.use('/api/advisor', advisorRoutes);
app.use('/api/hod', hodRoutes);
app.use('/api/scheduling', schedulingRoutes);

// Serve uploaded transcripts as static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the BatchMinder API' });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    timestamp: new Date(),
    uptime: process.uptime(),
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    status: 'error',
    message: err.message || 'Something went wrong on the server.',
  });
});

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

export default app;
