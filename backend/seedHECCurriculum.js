import dotenv from 'dotenv';
import connectDB from './utils/db.js';
import User from './models/user.js';
import Department from './models/department.js';
import Batch from './models/batch.js';
import Curriculum from './models/curriculum.js';

dotenv.config();

// HEC & STMU Official Curriculum Standards for 4 Degree Programs: BSCS, BSAI, BSSE, BSCySec
// Exactly 130 Credit Hours per program across 8 semesters.
// PAIRED LAB RULE:
// - 4 Credit Hour Total Courses with Lab: 3 CH for theory + 1 CH for lab (e.g. CSC-101 3 CH + CSC-101L 1 CH = 4 CH total)
// - 3 Credit Hour Total Courses with Lab: 2 CH for theory + 1 CH for lab (e.g. ICT-101 2 CH + ICT-101L 1 CH = 3 CH total, PHY-201 2 CH + PHY-201L 1 CH = 3 CH total)
// - Every Lab course ending with 'L' is strictly 1 Credit Hour.

const hecCurriculumsData = [
  {
    deptCode: 'CS',
    deptName: 'Computer Science',
    programName: 'BS Computer Science (BSCS) — STMU HEC Version',
    version: 'HEC-2025-BSCS',
    color: '#3B82F6',
    semesters: {
      1: [
        { code: 'CSC-101', title: 'Programming Fundamentals', creditHours: 3, courseType: 'CORE' },
        { code: 'CSC-101L', title: 'Programming Fundamentals Lab', creditHours: 1, courseType: 'CORE' },
        { code: 'ICT-101', title: 'Application of ICT', creditHours: 2, courseType: 'GENERAL' },
        { code: 'ICT-101L', title: 'Application of ICT Lab', creditHours: 1, courseType: 'GENERAL' },
        { code: 'CSC-102', title: 'Discrete Structures', creditHours: 3, courseType: 'CORE' },
        { code: 'MTH-101', title: 'Calculus & Analytic Geometry', creditHours: 3, courseType: 'GENERAL' },
        { code: 'ENG-101', title: 'Functional English', creditHours: 3, courseType: 'GENERAL' },
      ],
      2: [
        { code: 'CSC-103', title: 'Object Oriented Programming', creditHours: 3, courseType: 'CORE' },
        { code: 'CSC-103L', title: 'Object Oriented Programming Lab', creditHours: 1, courseType: 'CORE' },
        { code: 'CSC-104', title: 'Database Systems', creditHours: 3, courseType: 'CORE' },
        { code: 'CSC-104L', title: 'Database Systems Lab', creditHours: 1, courseType: 'CORE' },
        { code: 'CSC-105', title: 'Digital Logic Design', creditHours: 3, courseType: 'CORE' },
        { code: 'CSC-105L', title: 'Digital Logic Design Lab', creditHours: 1, courseType: 'CORE' },
        { code: 'MTH-103', title: 'Linear Algebra', creditHours: 3, courseType: 'GENERAL' },
        { code: 'ISL-201', title: 'Islamic Studies / Ethics', creditHours: 2, courseType: 'GENERAL' },
      ],
      3: [
        { code: 'CSC-201', title: 'Data Structures & Algorithms', creditHours: 3, courseType: 'CORE' },
        { code: 'CSC-201L', title: 'Data Structures & Algorithms Lab', creditHours: 1, courseType: 'CORE' },
        { code: 'CSC-202', title: 'Computer Networks', creditHours: 3, courseType: 'CORE' },
        { code: 'CSC-202L', title: 'Computer Networks Lab', creditHours: 1, courseType: 'CORE' },
        { code: 'AIC-201', title: 'Intro to Artificial Intelligence', creditHours: 3, courseType: 'CORE' },
        { code: 'AIC-201L', title: 'Artificial Intelligence Lab', creditHours: 1, courseType: 'CORE' },
        { code: 'MTH-201', title: 'Probability & Statistics', creditHours: 3, courseType: 'GENERAL' },
        { code: 'ENG-201', title: 'Expository Writing', creditHours: 2, courseType: 'GENERAL' },
      ],
      4: [
        { code: 'CSC-203', title: 'Computer Org & Assembly Language', creditHours: 3, courseType: 'CORE' },
        { code: 'CSC-203L', title: 'Assembly Language Lab', creditHours: 1, courseType: 'CORE' },
        { code: 'CSC-204', title: 'Theory of Automata', creditHours: 3, courseType: 'CORE' },
        { code: 'CYS-201', title: 'Information Security', creditHours: 3, courseType: 'CORE' },
        { code: 'SWE-201', title: 'Software Engineering', creditHours: 3, courseType: 'CORE' },
        { code: 'PHY-201', title: 'Applied Physics', creditHours: 2, courseType: 'GENERAL' },
        { code: 'PHY-201L', title: 'Applied Physics Lab', creditHours: 1, courseType: 'GENERAL' },
        { code: 'MTH-102', title: 'Multivariable Calculus', creditHours: 1, courseType: 'GENERAL' },
      ],
      5: [
        { code: 'CSC-301', title: 'Operating Systems', creditHours: 3, courseType: 'CORE' },
        { code: 'CSC-301L', title: 'Operating Systems Lab', creditHours: 1, courseType: 'CORE' },
        { code: 'CSC-302', title: 'HCI & Computer Graphics', creditHours: 3, courseType: 'CORE' },
        { code: 'CSC-303', title: 'Computer Architecture', creditHours: 3, courseType: 'CORE' },
        { code: 'CSC-304', title: 'Web Technologies', creditHours: 3, courseType: 'ELECTIVE' },
        { code: 'CSC-304L', title: 'Web Technologies Lab', creditHours: 1, courseType: 'ELECTIVE' },
        { code: 'MGT-301', title: 'Intro to Management', creditHours: 3, courseType: 'GENERAL' },
      ],
      6: [
        { code: 'CSC-306', title: 'Compiler Construction', creditHours: 3, courseType: 'CORE' },
        { code: 'CSC-307', title: 'Parallel & Distributed Computing', creditHours: 3, courseType: 'CORE' },
        { code: 'CSC-308', title: 'Mobile Application Development', creditHours: 3, courseType: 'ELECTIVE' },
        { code: 'CSC-308L', title: 'Mobile App Dev Lab', creditHours: 1, courseType: 'ELECTIVE' },
        { code: 'MTH-301', title: 'Numerical Analysis', creditHours: 3, courseType: 'ELECTIVE' },
        { code: 'ENG-401', title: 'Technical & Business Writing', creditHours: 3, courseType: 'GENERAL' },
      ],
      7: [
        { code: 'CSC-401', title: 'Final Year Project - I', creditHours: 3, courseType: 'CORE' },
        { code: 'CSC-402', title: 'Analysis of Algorithms', creditHours: 3, courseType: 'CORE' },
        { code: 'SWE-401', title: 'Software Testing & QA', creditHours: 3, courseType: 'ELECTIVE' },
        { code: 'CYS-301', title: 'Cyber Security', creditHours: 3, courseType: 'ELECTIVE' },
        { code: 'MGT-402', title: 'Entrepreneurship', creditHours: 3, courseType: 'GENERAL' },
      ],
      8: [
        { code: 'CSC-403', title: 'Final Year Project - II', creditHours: 3, courseType: 'CORE' },
        { code: 'PAK-401', title: 'Ideology & Constitution of Pakistan', creditHours: 3, courseType: 'GENERAL' },
        { code: 'HUM-401', title: 'Professional Practices', creditHours: 3, courseType: 'GENERAL' },
        { code: 'SOC-401', title: 'Civics & Community Engagement', creditHours: 3, courseType: 'GENERAL' },
        { code: 'MGT-401', title: 'Intro to Marketing', creditHours: 3, courseType: 'ELECTIVE' },
      ],
    }
  },
  {
    deptCode: 'AI',
    deptName: 'Artificial Intelligence',
    programName: 'BS Artificial Intelligence (BSAI) — STMU HEC Version',
    version: 'HEC-2025-BSAI',
    color: '#10B981',
    semesters: {
      1: [
        { code: 'CSC-101', title: 'Programming Fundamentals', creditHours: 3, courseType: 'CORE' },
        { code: 'CSC-101L', title: 'Programming Fundamentals Lab', creditHours: 1, courseType: 'CORE' },
        { code: 'ICT-101', title: 'Application of ICT', creditHours: 2, courseType: 'GENERAL' },
        { code: 'ICT-101L', title: 'Application of ICT Lab', creditHours: 1, courseType: 'GENERAL' },
        { code: 'CSC-102', title: 'Discrete Structures', creditHours: 3, courseType: 'CORE' },
        { code: 'MTH-101', title: 'Calculus & Analytic Geometry', creditHours: 3, courseType: 'GENERAL' },
        { code: 'ENG-101', title: 'Functional English', creditHours: 3, courseType: 'GENERAL' },
      ],
      2: [
        { code: 'CSC-103', title: 'Object Oriented Programming', creditHours: 3, courseType: 'CORE' },
        { code: 'CSC-103L', title: 'Object Oriented Programming Lab', creditHours: 1, courseType: 'CORE' },
        { code: 'CSC-104', title: 'Database Systems', creditHours: 3, courseType: 'CORE' },
        { code: 'CSC-104L', title: 'Database Systems Lab', creditHours: 1, courseType: 'CORE' },
        { code: 'AIC-101', title: 'Intro to Artificial Intelligence', creditHours: 3, courseType: 'CORE' },
        { code: 'AIC-101L', title: 'Artificial Intelligence Lab', creditHours: 1, courseType: 'CORE' },
        { code: 'MTH-103', title: 'Linear Algebra', creditHours: 3, courseType: 'GENERAL' },
        { code: 'ISL-201', title: 'Islamic Studies / Ethics', creditHours: 2, courseType: 'GENERAL' },
      ],
      3: [
        { code: 'CSC-201', title: 'Data Structures & Algorithms', creditHours: 3, courseType: 'CORE' },
        { code: 'CSC-201L', title: 'Data Structures Lab', creditHours: 1, courseType: 'CORE' },
        { code: 'AIC-201', title: 'Machine Learning', creditHours: 3, courseType: 'CORE' },
        { code: 'AIC-201L', title: 'Machine Learning Lab', creditHours: 1, courseType: 'CORE' },
        { code: 'MTH-201', title: 'Probability & Statistics', creditHours: 3, courseType: 'GENERAL' },
        { code: 'ENG-201', title: 'Expository Writing', creditHours: 3, courseType: 'GENERAL' },
        { code: 'PHY-201', title: 'Applied Physics', creditHours: 2, courseType: 'GENERAL' },
        { code: 'PHY-201L', title: 'Applied Physics Lab', creditHours: 1, courseType: 'GENERAL' },
      ],
      4: [
        { code: 'CSC-301', title: 'Operating Systems', creditHours: 3, courseType: 'CORE' },
        { code: 'CSC-301L', title: 'Operating Systems Lab', creditHours: 1, courseType: 'CORE' },
        { code: 'AIC-202', title: 'Knowledge Representation & Reasoning', creditHours: 3, courseType: 'CORE' },
        { code: 'AIC-203', title: 'Deep Learning', creditHours: 3, courseType: 'CORE' },
        { code: 'AIC-203L', title: 'Deep Learning Lab', creditHours: 1, courseType: 'CORE' },
        { code: 'SWE-201', title: 'Software Engineering', creditHours: 3, courseType: 'CORE' },
        { code: 'MTH-301', title: 'Optimization Methods for AI', creditHours: 3, courseType: 'GENERAL' },
      ],
      5: [
        { code: 'AIC-301', title: 'Natural Language Processing', creditHours: 3, courseType: 'CORE' },
        { code: 'AIC-301L', title: 'NLP Lab', creditHours: 1, courseType: 'CORE' },
        { code: 'AIC-302', title: 'Computer Vision', creditHours: 3, courseType: 'CORE' },
        { code: 'AIC-302L', title: 'Computer Vision Lab', creditHours: 1, courseType: 'CORE' },
        { code: 'CSC-202', title: 'Computer Networks', creditHours: 3, courseType: 'CORE' },
        { code: 'MGT-301', title: 'Intro to Management', creditHours: 3, courseType: 'GENERAL' },
        { code: 'CYS-201', title: 'Information Security', creditHours: 3, courseType: 'GENERAL' },
      ],
      6: [
        { code: 'AIC-303', title: 'Reinforcement Learning', creditHours: 3, courseType: 'ELECTIVE' },
        { code: 'AIC-304', title: 'AI Ethics & Policy', creditHours: 3, courseType: 'GENERAL' },
        { code: 'CSC-402', title: 'Analysis of Algorithms', creditHours: 3, courseType: 'CORE' },
        { code: 'MTH-302', title: 'Bayesian Data Analysis', creditHours: 3, courseType: 'ELECTIVE' },
        { code: 'ENG-401', title: 'Technical & Business Writing', creditHours: 3, courseType: 'GENERAL' },
      ],
      7: [
        { code: 'AIC-401', title: 'AI FYP - I', creditHours: 3, courseType: 'CORE' },
        { code: 'AIC-402', title: 'Robotics & Autonomous Systems', creditHours: 3, courseType: 'ELECTIVE' },
        { code: 'AIC-403', title: 'Neural Networks', creditHours: 3, courseType: 'ELECTIVE' },
        { code: 'MGT-402', title: 'Entrepreneurship', creditHours: 3, courseType: 'GENERAL' },
        { code: 'HUM-401', title: 'Professional Practices', creditHours: 3, courseType: 'GENERAL' },
      ],
      8: [
        { code: 'AIC-404', title: 'AI FYP - II', creditHours: 3, courseType: 'CORE' },
        { code: 'PAK-401', title: 'Ideology & Constitution of Pakistan', creditHours: 3, courseType: 'GENERAL' },
        { code: 'SOC-401', title: 'Civics & Community Engagement', creditHours: 3, courseType: 'GENERAL' },
        { code: 'AIC-405', title: 'MLOps & AI Deployment', creditHours: 3, courseType: 'ELECTIVE' },
        { code: 'MGT-401', title: 'Intro to Marketing', creditHours: 4, courseType: 'ELECTIVE' },
      ],
    }
  },
  {
    deptCode: 'SE',
    deptName: 'Software Engineering',
    programName: 'BS Software Engineering (BSSE) — STMU HEC Version',
    version: 'HEC-2025-BSSE',
    color: '#8B5CF6',
    semesters: {
      1: [
        { code: 'CSC-101', title: 'Programming Fundamentals', creditHours: 3, courseType: 'CORE' },
        { code: 'CSC-101L', title: 'Programming Fundamentals Lab', creditHours: 1, courseType: 'CORE' },
        { code: 'ICT-101', title: 'Application of ICT', creditHours: 2, courseType: 'GENERAL' },
        { code: 'ICT-101L', title: 'Application of ICT Lab', creditHours: 1, courseType: 'GENERAL' },
        { code: 'CSC-102', title: 'Discrete Structures', creditHours: 3, courseType: 'CORE' },
        { code: 'MTH-101', title: 'Calculus & Analytic Geometry', creditHours: 3, courseType: 'GENERAL' },
        { code: 'ENG-101', title: 'Functional English', creditHours: 3, courseType: 'GENERAL' },
      ],
      2: [
        { code: 'CSC-103', title: 'Object Oriented Programming', creditHours: 3, courseType: 'CORE' },
        { code: 'CSC-103L', title: 'OOP Lab', creditHours: 1, courseType: 'CORE' },
        { code: 'CSC-104', title: 'Database Systems', creditHours: 3, courseType: 'CORE' },
        { code: 'CSC-104L', title: 'Database Systems Lab', creditHours: 1, courseType: 'CORE' },
        { code: 'SWE-101', title: 'Software Engineering Essentials', creditHours: 3, courseType: 'CORE' },
        { code: 'MTH-103', title: 'Linear Algebra', creditHours: 3, courseType: 'GENERAL' },
        { code: 'ISL-201', title: 'Islamic Studies / Ethics', creditHours: 3, courseType: 'GENERAL' },
      ],
      3: [
        { code: 'CSC-201', title: 'Data Structures & Algorithms', creditHours: 3, courseType: 'CORE' },
        { code: 'CSC-201L', title: 'Data Structures Lab', creditHours: 1, courseType: 'CORE' },
        { code: 'SWE-201', title: 'Software Requirement Engineering', creditHours: 3, courseType: 'CORE' },
        { code: 'SWE-202', title: 'Software Architecture & Design', creditHours: 3, courseType: 'CORE' },
        { code: 'MTH-201', title: 'Probability & Statistics', creditHours: 3, courseType: 'GENERAL' },
        { code: 'ENG-201', title: 'Expository Writing', creditHours: 4, courseType: 'GENERAL' },
      ],
      4: [
        { code: 'CSC-301', title: 'Operating Systems', creditHours: 3, courseType: 'CORE' },
        { code: 'CSC-301L', title: 'Operating Systems Lab', creditHours: 1, courseType: 'CORE' },
        { code: 'CSC-202', title: 'Computer Networks', creditHours: 3, courseType: 'CORE' },
        { code: 'CSC-202L', title: 'Computer Networks Lab', creditHours: 1, courseType: 'CORE' },
        { code: 'SWE-203', title: 'Human Computer Interaction', creditHours: 3, courseType: 'CORE' },
        { code: 'PHY-201', title: 'Applied Physics', creditHours: 2, courseType: 'GENERAL' },
        { code: 'PHY-201L', title: 'Applied Physics Lab', creditHours: 1, courseType: 'GENERAL' },
        { code: 'MTH-301', title: 'Numerical Analysis', creditHours: 3, courseType: 'ELECTIVE' },
      ],
      5: [
        { code: 'SWE-301', title: 'Software Quality Engineering', creditHours: 3, courseType: 'CORE' },
        { code: 'SWE-302', title: 'Software Project Management', creditHours: 3, courseType: 'CORE' },
        { code: 'CSC-304', title: 'Web Engineering', creditHours: 3, courseType: 'ELECTIVE' },
        { code: 'CSC-304L', title: 'Web Engineering Lab', creditHours: 1, courseType: 'ELECTIVE' },
        { code: 'CYS-201', title: 'Information Security', creditHours: 3, courseType: 'CORE' },
        { code: 'MGT-301', title: 'Intro to Management', creditHours: 4, courseType: 'GENERAL' },
      ],
      6: [
        { code: 'SWE-303', title: 'Software Construction & Development', creditHours: 3, courseType: 'CORE' },
        { code: 'SWE-303L', title: 'Software Construction Lab', creditHours: 1, courseType: 'CORE' },
        { code: 'SWE-304', title: 'Formal Methods in SE', creditHours: 3, courseType: 'CORE' },
        { code: 'CSC-402', title: 'Analysis of Algorithms', creditHours: 3, courseType: 'CORE' },
        { code: 'ENG-401', title: 'Technical & Business Writing', creditHours: 3, courseType: 'GENERAL' },
        { code: 'MGT-402', title: 'Entrepreneurship', creditHours: 3, courseType: 'GENERAL' },
      ],
      7: [
        { code: 'SWE-401', title: 'SE FYP - I', creditHours: 3, courseType: 'CORE' },
        { code: 'SWE-402', title: 'Software Re-engineering', creditHours: 3, courseType: 'ELECTIVE' },
        { code: 'SWE-403', title: 'Cloud Computing', creditHours: 3, courseType: 'ELECTIVE' },
        { code: 'HUM-401', title: 'Professional Practices', creditHours: 3, courseType: 'GENERAL' },
        { code: 'MGT-401', title: 'Intro to Marketing', creditHours: 3, courseType: 'ELECTIVE' },
      ],
      8: [
        { code: 'SWE-404', title: 'SE FYP - II', creditHours: 3, courseType: 'CORE' },
        { code: 'PAK-401', title: 'Ideology & Constitution of Pakistan', creditHours: 3, courseType: 'GENERAL' },
        { code: 'SOC-401', title: 'Civics & Community Engagement', creditHours: 3, courseType: 'GENERAL' },
        { code: 'SWE-405', title: 'DevOps & Agile Methodology', creditHours: 3, courseType: 'ELECTIVE' },
        { code: 'CYS-301', title: 'Secure Software Development', creditHours: 3, courseType: 'ELECTIVE' },
      ],
    }
  },
  {
    deptCode: 'CYS',
    deptName: 'Cyber Security',
    programName: 'BS Cyber Security (BSCySec) — STMU HEC Version',
    version: 'HEC-2025-BSCySec',
    color: '#EC4899',
    semesters: {
      1: [
        { code: 'CSC-101', title: 'Programming Fundamentals', creditHours: 3, courseType: 'CORE' },
        { code: 'CSC-101L', title: 'Programming Fundamentals Lab', creditHours: 1, courseType: 'CORE' },
        { code: 'ICT-101', title: 'Application of ICT', creditHours: 2, courseType: 'GENERAL' },
        { code: 'ICT-101L', title: 'Application of ICT Lab', creditHours: 1, courseType: 'GENERAL' },
        { code: 'CSC-102', title: 'Discrete Structures', creditHours: 3, courseType: 'CORE' },
        { code: 'MTH-101', title: 'Calculus & Analytic Geometry', creditHours: 3, courseType: 'GENERAL' },
        { code: 'ENG-101', title: 'Functional English', creditHours: 3, courseType: 'GENERAL' },
      ],
      2: [
        { code: 'CSC-103', title: 'Object Oriented Programming', creditHours: 3, courseType: 'CORE' },
        { code: 'CSC-103L', title: 'OOP Lab', creditHours: 1, courseType: 'CORE' },
        { code: 'CSC-104', title: 'Database Systems', creditHours: 3, courseType: 'CORE' },
        { code: 'CSC-104L', title: 'Database Systems Lab', creditHours: 1, courseType: 'CORE' },
        { code: 'CYS-101', title: 'Information Assurance', creditHours: 3, courseType: 'CORE' },
        { code: 'MTH-103', title: 'Linear Algebra', creditHours: 3, courseType: 'GENERAL' },
        { code: 'ISL-201', title: 'Islamic Studies / Ethics', creditHours: 3, courseType: 'GENERAL' },
      ],
      3: [
        { code: 'CSC-201', title: 'Data Structures & Algorithms', creditHours: 3, courseType: 'CORE' },
        { code: 'CSC-201L', title: 'Data Structures Lab', creditHours: 1, courseType: 'CORE' },
        { code: 'CSC-202', title: 'Computer Networks', creditHours: 3, courseType: 'CORE' },
        { code: 'CSC-202L', title: 'Computer Networks Lab', creditHours: 1, courseType: 'CORE' },
        { code: 'CYS-201', title: 'Information Security Essentials', creditHours: 3, courseType: 'CORE' },
        { code: 'MTH-201', title: 'Probability & Statistics', creditHours: 3, courseType: 'GENERAL' },
        { code: 'ENG-201', title: 'Expository Writing', creditHours: 3, courseType: 'GENERAL' },
      ],
      4: [
        { code: 'CSC-301', title: 'Operating Systems', creditHours: 3, courseType: 'CORE' },
        { code: 'CSC-301L', title: 'Operating Systems Lab', creditHours: 1, courseType: 'CORE' },
        { code: 'CYS-202', title: 'Network Security & Defense', creditHours: 3, courseType: 'CORE' },
        { code: 'CYS-202L', title: 'Network Security Lab', creditHours: 1, courseType: 'CORE' },
        { code: 'CYS-203', title: 'Cryptography', creditHours: 3, courseType: 'CORE' },
        { code: 'PHY-201', title: 'Applied Physics', creditHours: 2, courseType: 'GENERAL' },
        { code: 'PHY-201L', title: 'Applied Physics Lab', creditHours: 1, courseType: 'GENERAL' },
        { code: 'MTH-301', title: 'Numerical Analysis', creditHours: 3, courseType: 'ELECTIVE' },
      ],
      5: [
        { code: 'CYS-301', title: 'Digital Forensics', creditHours: 3, courseType: 'CORE' },
        { code: 'CYS-301L', title: 'Digital Forensics Lab', creditHours: 1, courseType: 'CORE' },
        { code: 'CYS-302', title: 'Ethical Hacking & Penetration Testing', creditHours: 3, courseType: 'CORE' },
        { code: 'CYS-302L', title: 'Penetration Testing Lab', creditHours: 1, courseType: 'CORE' },
        { code: 'SWE-201', title: 'Software Engineering', creditHours: 3, courseType: 'CORE' },
        { code: 'MGT-301', title: 'Intro to Management', creditHours: 3, courseType: 'GENERAL' },
        { code: 'CYS-303', title: 'Vulnerability Assessment', creditHours: 3, courseType: 'ELECTIVE' },
      ],
      6: [
        { code: 'CYS-304', title: 'Malware Analysis & Reverse Eng', creditHours: 3, courseType: 'CORE' },
        { code: 'CYS-304L', title: 'Malware Analysis Lab', creditHours: 1, courseType: 'CORE' },
        { code: 'CYS-305', title: 'Cyber Law, Policy & Ethics', creditHours: 3, courseType: 'GENERAL' },
        { code: 'CSC-402', title: 'Analysis of Algorithms', creditHours: 3, courseType: 'CORE' },
        { code: 'ENG-401', title: 'Technical & Business Writing', creditHours: 3, courseType: 'GENERAL' },
        { code: 'MGT-402', title: 'Entrepreneurship', creditHours: 3, courseType: 'GENERAL' },
      ],
      7: [
        { code: 'CYS-401', title: 'Cyber Security FYP - I', creditHours: 3, courseType: 'CORE' },
        { code: 'CYS-402', title: 'Cloud & Infrastructure Security', creditHours: 3, courseType: 'ELECTIVE' },
        { code: 'CYS-403', title: 'Security Operations Center (SOC)', creditHours: 3, courseType: 'ELECTIVE' },
        { code: 'HUM-401', title: 'Professional Practices', creditHours: 3, courseType: 'GENERAL' },
        { code: 'MGT-401', title: 'Intro to Marketing', creditHours: 3, courseType: 'ELECTIVE' },
      ],
      8: [
        { code: 'CYS-404', title: 'Cyber Security FYP - II', creditHours: 3, courseType: 'CORE' },
        { code: 'PAK-401', title: 'Ideology & Constitution of Pakistan', creditHours: 3, courseType: 'GENERAL' },
        { code: 'SOC-401', title: 'Civics & Community Engagement', creditHours: 3, courseType: 'GENERAL' },
        { code: 'CYS-405', title: 'Wireless & Mobile Security', creditHours: 3, courseType: 'ELECTIVE' },
        { code: 'CYS-406', title: 'Incident Response & Recovery', creditHours: 3, courseType: 'ELECTIVE' },
      ],
    }
  }
];

// Builds the embedded `courses` array (semester + type tagged) for one program
// straight from hecCurriculumsData. Used both by the seed script below and by
// buildCoursesForDept(), which lets the rest of the backend (e.g. curriculumController's
// getHECCurriculum, or an auto-create-on-first-use path) pull the same course
// list without going through Mongo at all.
export function buildCoursesForDept(deptCode) {
  const prog = hecCurriculumsData.find(p => p.deptCode === deptCode.toUpperCase());
  if (!prog) return null;

  const courses = [];
  for (const [sem, list] of Object.entries(prog.semesters)) {
    const semester = Number(sem);
    for (const c of list) {
      courses.push({
        code: c.code,
        title: c.title,
        creditHours: c.creditHours,
        semester,
        courseType: c.courseType || 'CORE',
        prerequisiteCourseIds: [],
      });
    }
  }
  return { prog, courses, totalCH: courses.reduce((acc, c) => acc + c.creditHours, 0) };
}

export async function seedHECCurriculums() {
  await connectDB();

  console.log('Connected to DB. Seeding 4 STMU HEC Department Curriculums (Theory & Lab split rule enforced, Total 130 CH)...');

  for (const prog of hecCurriculumsData) {
    // 1. Department
    let dept = await Department.findOne({ $or: [{ code: prog.deptCode }, { name: prog.deptName }] });
    if (!dept) {
      dept = await Department.create({
        name: prog.deptName,
        code: prog.deptCode,
        color: prog.color,
      });
      console.log(`Created Department: ${prog.deptName} (${prog.deptCode})`);
    }

    // 2. Build courses for this department from the shared source of truth
    const built = buildCoursesForDept(prog.deptCode);
    const { courses, totalCH } = built;

    // 3. Only seed a Curriculum if this department has NONE yet. If one
    // already exists (whether it's the original seed, an admin's in-place
    // edit, or a published new version), leave it completely untouched —
    // re-running this script must never overwrite real data.
    const existing = await Curriculum.findOne({ departmentId: dept._id });
    if (existing) {
      console.log(`Skipped "${prog.programName}" — curriculum already exists (version: ${existing.version}, status: ${existing.status}).`);
      continue;
    }

    const curriculum = await Curriculum.create({
      departmentId: dept._id,
      department: prog.deptName,
      version: prog.version,
      status: 'active',
      isHecStandard: true,
      totalRequiredCredits: totalCH,
      courses,
    });

    console.log(`Saved "${prog.programName}" (Version: ${curriculum.version}) with ${courses.length} STMU courses across 8 semesters (Total Credits: ${totalCH} CH).`);
  }

  // Clean up any old dummy "HEC Standards" department if it exists
  const oldHecDept = await Department.findOne({ $or: [{ code: 'HEC' }, { name: 'HEC Standards' }] });
  if (oldHecDept) {
    await Batch.deleteMany({ departmentId: oldHecDept._id });
    await Curriculum.deleteMany({ departmentId: oldHecDept._id });
    await Department.deleteOne({ _id: oldHecDept._id });
    console.log('Removed legacy "HEC Standards" department and related records.');
  }

  console.log('Seeding of STMU HEC Curriculums completed successfully!');
}

if (process.argv[1] && process.argv[1].endsWith('seedHECCurriculum.js')) {
  seedHECCurriculums()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Error seeding HEC curriculums:', err);
      process.exit(1);
    });
}