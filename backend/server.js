import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
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
import connectDB from './utils/db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

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
app.use('/api/users', userRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/batches', batchRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/migrations', migrationRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/advisor', advisorRoutes);
app.use('/api/hod', hodRoutes);

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

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
