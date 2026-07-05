import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from './utils/db.js';
import User from './models/user.js';
import Department from './models/department.js';
import Batch from './models/batch.js';
import Notification from './models/notification.js';

dotenv.config();

const users = [
  {
    name: 'Dr. Ahmed Raza',
    email: 'a.raza@stmu.edu.pk',
    password: 'password123',
    role: 'advisor',
    dept: 'Computer Science',
    status: 'Active',
    phone: '+92 300 1234567',
    employeeId: 'STMU-2024-ADV-001'
  },
  {
    name: 'Dr. Fatima Malik',
    email: 'f.malik@stmu.edu.pk',
    password: 'password123',
    role: 'advisor',
    dept: 'Computer Science',
    status: 'Pending',
    phone: '+92 300 7654321',
    employeeId: 'STMU-2024-ADV-002'
  },
  {
    name: 'Mr. Usman Ahmed',
    email: 'u.ahmed@stmu.edu.pk',
    password: 'password123',
    role: 'advisor',
    dept: 'Software Engineering',
    status: 'Active',
    phone: '+92 312 9876543',
    employeeId: 'STMU-2024-ADV-003'
  },
  {
    name: 'Prof. Zainab Khan',
    email: 'z.khan@stmu.edu.pk',
    password: 'password123',
    role: 'admin',
    dept: 'Computer Science',
    status: 'Active',
    phone: '+92 333 4567890',
    employeeId: 'STMU-2024-HOD-001'
  },
  {
    name: 'Mr. Tariq Hussain',
    email: 't.hussain@stmu.edu.pk',
    password: 'password123',
    role: 'advisor',
    dept: 'Electrical Engineering',
    status: 'Inactive',
    phone: '+92 321 6543210',
    employeeId: 'STMU-2024-ADV-004'
  },
  {
    name: 'Dr. Sara Riaz',
    email: 's.riaz@stmu.edu.pk',
    password: 'password123',
    role: 'admin',
    dept: 'Software Engineering',
    status: 'Active',
    phone: '+92 345 9876543',
    employeeId: 'STMU-2024-HOD-002'
  },
  {
    name: 'Mr. Mohammad Kamil',
    email: 'm.kamil@stmu.edu.pk',
    password: 'password123',
    role: 'academic_admin',
    dept: 'All Departments',
    status: 'Active',
    phone: '+92 300 0001112',
    employeeId: 'STMU-2024-ADM-001'
  },
  {
    name: 'Ms. Nadia Baig',
    email: 'n.baig@stmu.edu.pk',
    password: 'password123',
    role: 'advisor',
    dept: 'Electrical Engineering',
    status: 'Inactive',
    phone: '+92 300 9998887',
    employeeId: 'STMU-2024-ADV-005'
  },
  {
    name: 'Super Admin User',
    email: 'superadmin@stmu.edu.pk',
    password: 'password123',
    role: 'super_admin',
    dept: 'System Controls',
    status: 'Active',
    phone: '+92 300 1112223',
    employeeId: 'STMU-2024-SA-001'
  }
];

const departments = [
  {
    code: 'CS',
    name: 'Computer Science',
    hod: 'Prof. Zainab Khan',
    established: 2018,
    status: 'Active',
    color: '#3B82F6'
  },
  {
    code: 'SE',
    name: 'Software Engineering',
    hod: 'Dr. Sara Riaz',
    established: 2019,
    status: 'Active',
    color: '#7C3AED'
  },
  {
    code: 'EE',
    name: 'Electrical Engineering',
    hod: 'Dr. Alice Green',
    established: 2020,
    status: 'Active',
    color: '#EF4444'
  }
];

const batches = [
  { code: 'BSCS-2021', dept: 'Computer Science', advisor: 'Dr. Ahmed Raza', status: 'Allocated' },
  { code: 'BSCS-2022', dept: 'Computer Science', advisor: 'Dr. Ahmed Raza', status: 'Allocated' },
  { code: 'BSCS-2023', dept: 'Computer Science', advisor: 'Dr. Fatima Malik', status: 'Allocated' },
  { code: 'BSSE-2021', dept: 'Software Engineering', advisor: 'Mr. Usman Ahmed', status: 'Allocated' },
  { code: 'BSSE-2022', dept: 'Software Engineering', advisor: 'Mr. Usman Ahmed', status: 'Allocated' },
  { code: 'BSEE-2021', dept: 'Electrical Engineering', advisor: 'Ms. Nadia Baig', status: 'Allocated' },
  { code: 'BSEE-2022', dept: 'Electrical Engineering', advisor: 'Mr. Tariq Hussain', status: 'Allocated' }
];

const notifications = [
  { message: 'Database hourly backup completed successfully', type: 'info', recipientRole: 'super_admin', isRead: true, createdAt: new Date(Date.now() - 600000) },
  { message: 'Critical: Student migration request #124 pending HOD approval', type: 'critical', recipientRole: 'admin', departmentId: 'Software Engineering', isRead: false, createdAt: new Date(Date.now() - 3600000) },
  { message: 'New Super Admin account registered via recovery link', type: 'warning', recipientRole: 'super_admin', isRead: false, createdAt: new Date(Date.now() - 7200000) },
  { message: 'System Warning: High disk load detected on primary storage', type: 'warning', recipientRole: 'super_admin', isRead: false, createdAt: new Date(Date.now() - 14400000) },
  { message: 'Student alert triggered: attendance below 75% on BSCS-2021', type: 'info', recipientRole: 'advisor', departmentId: 'Computer Science', batchId: 'BSCS-2021', isRead: true, createdAt: new Date(Date.now() - 86400000) }
];

const seedDB = async () => {
  try {
    await connectDB();
    console.log('Connected to database.');

    // Clear collections
    console.log('Clearing User collection...');
    await User.deleteMany({});
    
    console.log('Clearing Department collection...');
    await Department.deleteMany({});
    
    console.log('Clearing Batch collection...');
    await Batch.deleteMany({});
    
    console.log('Clearing Notification collection...');
    await Notification.deleteMany({});

    // Seed users
    console.log('Seeding users...');
    for (const u of users) {
      await User.create(u);
    }

    // Seed departments
    console.log('Seeding departments...');
    for (const d of departments) {
      await Department.create(d);
    }

    // Seed batches
    console.log('Seeding batches...');
    for (const b of batches) {
      await Batch.create(b);
    }

    // Seed notifications
    console.log('Seeding notifications...');
    for (const n of notifications) {
      await Notification.create(n);
    }

    console.log('Seeding completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding database:', err);
    process.exit(1);
  }
};

seedDB();
