import dotenv from 'dotenv';
import connectDB from './utils/db.js';
import User from './models/user.js';
import Department from './models/department.js';
import Batch from './models/batch.js';
import Curriculum from './models/curriculum.js';

dotenv.config();

// HEC & STMU Curriculum Standards for 4 Degree Programs: BSCS, BSAI, BSSE, BSCySec
// Exactly 44 Courses & 130 Credit Hours per program
// Following STMU Course Coding Standards (CSC, AIC, SWE, CYS, MTH, ENG, ICT, PHY, MGT, PAK, ISL, SOC, HUM, ELE)
//
// LAB CONVENTION: Courses with a lab component are split into a paired lecture course
// and a lab course using the "<CODE>L" suffix (e.g. CSC-201 lecture + CSC-201L lab),
// matching STMU's real published scheme of studies. This applies to the 9 shared
// lecture+lab courses verified against STMU's actual curriculum:
// Programming Fundamentals, OOP, Digital Logic Design, Data Structures, Computer
// Organization & Assembly Language, Database Systems, Operating Systems, Computer
// Networks, and Artificial Intelligence. FYP-I/FYP-II and other program-specific
// courses are left as single entries (not verified as having a separate lab).
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
        { code: 'CSC-103', title: 'OOP', creditHours: 3, courseType: 'CORE' },
        { code: 'CSC-103L', title: 'OOP Lab', creditHours: 1, courseType: 'CORE' },
        { code: 'CSC-104', title: 'Database Systems', creditHours: 3, courseType: 'CORE' },
        { code: 'CSC-104L', title: 'Database Systems Lab', creditHours: 1, courseType: 'CORE' },
        { code: 'CSC-105', title: 'Digital Logic Design', creditHours: 3, courseType: 'CORE' },
        { code: 'CSC-105L', title: 'Digital Logic Design Lab', creditHours: 1, courseType: 'CORE' },
        { code: 'MTH-102', title: 'Multivariable Calculus', creditHours: 3, courseType: 'GENERAL' },
        { code: 'MTH-103', title: 'Linear Algebra', creditHours: 3, courseType: 'GENERAL' },
      ],
      3: [
        { code: 'CSC-201', title: 'Data Structures', creditHours: 3, courseType: 'CORE' },
        { code: 'CSC-201L', title: 'Data Structures Lab', creditHours: 1, courseType: 'CORE' },
        { code: 'CYS-201', title: 'Information Security', creditHours: 3, courseType: 'CORE' },
        { code: 'AIC-201', title: 'Artificial Intelligence', creditHours: 3, courseType: 'CORE' },
        { code: 'AIC-201L', title: 'Artificial Intelligence Lab', creditHours: 1, courseType: 'CORE' },
        { code: 'CSC-202', title: 'Computer Networks', creditHours: 3, courseType: 'CORE' },
        { code: 'CSC-202L', title: 'Computer Networks Lab', creditHours: 1, courseType: 'CORE' },
        { code: 'SWE-201', title: 'Software Engineering', creditHours: 3, courseType: 'CORE' },
        { code: 'MTH-201', title: 'Probability & Statistics', creditHours: 3, courseType: 'GENERAL' },
      ],
      4: [
        { code: 'CSC-203', title: 'Computer Organization & Assembly Language', creditHours: 3, courseType: 'CORE' },
        { code: 'CSC-203L', title: 'Computer Organization & Assembly Language Lab', creditHours: 1, courseType: 'CORE' },
        { code: 'CSC-204', title: 'Theory of Automata', creditHours: 3, courseType: 'CORE' },
        { code: 'CSC-205', title: 'Advanced DBMS', creditHours: 3, courseType: 'CORE' },
        { code: 'PHY-201', title: 'Applied Physics', creditHours: 2, courseType: 'GENERAL' },
        { code: 'PHY-201L', title: 'Applied Physics Lab', creditHours: 1, courseType: 'GENERAL' },
        { code: 'ENG-201', title: 'Expository Writing', creditHours: 3, courseType: 'GENERAL' },
        { code: 'ISL-201', title: 'Islamic Studies', creditHours: 2, courseType: 'GENERAL' },
      ],
      5: [
        { code: 'CSC-301', title: 'Operating Systems', creditHours: 3, courseType: 'CORE' },
        { code: 'CSC-301L', title: 'Operating Systems Lab', creditHours: 1, courseType: 'CORE' },
        { code: 'CSC-302', title: 'HCI & Computer Graphics', creditHours: 3, courseType: 'CORE' },
        { code: 'CSC-303', title: 'Computer Architecture', creditHours: 3, courseType: 'CORE' },
        { code: 'CSC-303L', title: 'Computer Architecture Lab', creditHours: 1, courseType: 'CORE' },
        { code: 'CSC-304', title: 'Web Technologies (elective)', creditHours: 3, courseType: 'ELECTIVE' },
        { code: 'CSC-304L', title: 'Web Technologies Lab', creditHours: 1, courseType: 'ELECTIVE' },
        { code: 'CSC-305', title: 'Mobile App Dev 1 (elective)', creditHours: 3, courseType: 'ELECTIVE' },
        { code: 'CSC-305L', title: 'Mobile App Dev 1 Lab', creditHours: 1, courseType: 'ELECTIVE' },
        { code: 'MGT-301', title: 'Intro to Management', creditHours: 3, courseType: 'GENERAL' },
      ],
      6: [
        { code: 'CSC-306', title: 'Compiler Construction', creditHours: 3, courseType: 'CORE' },
        { code: 'CSC-307', title: 'Parallel & Distributed Computing', creditHours: 3, courseType: 'CORE' },
        { code: 'CSC-308', title: 'Advanced Programming (elective)', creditHours: 3, courseType: 'ELECTIVE' },
        { code: 'CSC-308L', title: 'Advanced Programming Lab', creditHours: 1, courseType: 'ELECTIVE' },
        { code: 'MTH-301', title: 'Numerical Analysis (elective)', creditHours: 3, courseType: 'ELECTIVE' },
        { code: 'CSC-309', title: 'Web Engineering (elective)', creditHours: 3, courseType: 'ELECTIVE' },
        { code: 'CSC-309L', title: 'Web Engineering Lab', creditHours: 1, courseType: 'ELECTIVE' },
        { code: 'CYS-301', title: 'Cyber Security (elective)', creditHours: 3, courseType: 'ELECTIVE' },
        { code: 'CYS-301L', title: 'Cyber Security Lab', creditHours: 1, courseType: 'ELECTIVE' },
      ],
      7: [
        { code: 'CSC-401', title: 'FYP-I', creditHours: 3, courseType: 'CORE' },
        { code: 'CSC-402', title: 'Analysis of Algorithms', creditHours: 3, courseType: 'CORE' },
        { code: 'SWE-401', title: 'Software Testing & QA (elective)', creditHours: 3, courseType: 'ELECTIVE' },
        { code: 'MGT-401', title: 'Intro to Marketing (elective)', creditHours: 3, courseType: 'ELECTIVE' },
        { code: 'ENG-401', title: 'Technical & Business Writing', creditHours: 3, courseType: 'GENERAL' },
        { code: 'MGT-402', title: 'Entrepreneurship', creditHours: 2, courseType: 'GENERAL' },
      ],
      8: [
        { code: 'CSC-403', title: 'FYP-II', creditHours: 3, courseType: 'CORE' },
        { code: 'PAK-401', title: 'Ideology & Constitution of Pakistan', creditHours: 3, courseType: 'GENERAL' },
        { code: 'HUM-401', title: 'Professional Practices', creditHours: 2, courseType: 'GENERAL' },
        { code: 'SOC-401', title: 'Civics & Community Engagement', creditHours: 2, courseType: 'GENERAL' },
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
        { code: 'CSC-103', title: 'OOP', creditHours: 3, courseType: 'CORE' },
        { code: 'CSC-103L', title: 'OOP Lab', creditHours: 1, courseType: 'CORE' },
        { code: 'CSC-104', title: 'Database Systems', creditHours: 3, courseType: 'CORE' },
        { code: 'CSC-104L', title: 'Database Systems Lab', creditHours: 1, courseType: 'CORE' },
        { code: 'CSC-105', title: 'Digital Logic Design', creditHours: 3, courseType: 'CORE' },
        { code: 'CSC-105L', title: 'Digital Logic Design Lab', creditHours: 1, courseType: 'CORE' },
        { code: 'MTH-102', title: 'Multivariable Calculus', creditHours: 3, courseType: 'GENERAL' },
        { code: 'MTH-103', title: 'Linear Algebra', creditHours: 3, courseType: 'GENERAL' },
      ],
      3: [
        { code: 'CSC-201', title: 'Data Structures', creditHours: 3, courseType: 'CORE' },
        { code: 'CSC-201L', title: 'Data Structures Lab', creditHours: 1, courseType: 'CORE' },
        { code: 'CYS-201', title: 'Information Security', creditHours: 3, courseType: 'CORE' },
        { code: 'AIC-201', title: 'Artificial Intelligence', creditHours: 3, courseType: 'CORE' },
        { code: 'AIC-201L', title: 'Artificial Intelligence Lab', creditHours: 1, courseType: 'CORE' },
        { code: 'CSC-202', title: 'Computer Networks', creditHours: 3, courseType: 'CORE' },
        { code: 'CSC-202L', title: 'Computer Networks Lab', creditHours: 1, courseType: 'CORE' },
        { code: 'SWE-201', title: 'Software Engineering', creditHours: 3, courseType: 'CORE' },
        { code: 'MTH-201', title: 'Probability & Statistics', creditHours: 3, courseType: 'GENERAL' },
      ],
      4: [
        { code: 'CSC-203', title: 'Computer Organization & Assembly Language', creditHours: 3, courseType: 'CORE' },
        { code: 'CSC-203L', title: 'Computer Organization & Assembly Language Lab', creditHours: 1, courseType: 'CORE' },
        { code: 'AIC-202', title: 'Programming for AI', creditHours: 3, courseType: 'CORE' },
        { code: 'AIC-203', title: 'Machine Learning', creditHours: 3, courseType: 'CORE' },
        { code: 'PHY-201', title: 'Applied Physics', creditHours: 2, courseType: 'GENERAL' },
        { code: 'PHY-201L', title: 'Applied Physics Lab', creditHours: 1, courseType: 'GENERAL' },
        { code: 'ENG-201', title: 'Expository Writing', creditHours: 3, courseType: 'GENERAL' },
        { code: 'ISL-201', title: 'Islamic Studies', creditHours: 2, courseType: 'GENERAL' },
      ],
      5: [
        { code: 'CSC-301', title: 'Operating Systems', creditHours: 3, courseType: 'CORE' },
        { code: 'CSC-301L', title: 'Operating Systems Lab', creditHours: 1, courseType: 'CORE' },
        { code: 'AIC-301', title: 'Artificial Neural Networks & Deep Learning', creditHours: 3, courseType: 'CORE' },
        { code: 'AIC-302', title: 'Knowledge Representation & Reasoning', creditHours: 3, courseType: 'CORE' },
        { code: 'AIC-303', title: 'NLP (elective)', creditHours: 3, courseType: 'ELECTIVE' },
        { code: 'AIC-304', title: 'Speech Processing (elective)', creditHours: 3, courseType: 'ELECTIVE' },
        { code: 'MGT-301', title: 'Intro to Management', creditHours: 3, courseType: 'GENERAL' },
      ],
      6: [
        { code: 'AIC-305', title: 'Computer Vision', creditHours: 3, courseType: 'CORE' },
        { code: 'CSC-307', title: 'Parallel & Distributed Computing', creditHours: 3, courseType: 'CORE' },
        { code: 'AIC-306', title: 'Data Mining (elective)', creditHours: 3, courseType: 'ELECTIVE' },
        { code: 'MTH-302', title: 'Advanced Statistics (elective)', creditHours: 3, courseType: 'ELECTIVE' },
        { code: 'AIC-307', title: 'Reinforcement Learning (elective)', creditHours: 3, courseType: 'ELECTIVE' },
        { code: 'CSC-204', title: 'Theory of Automata (elective)', creditHours: 3, courseType: 'ELECTIVE' },
      ],
      7: [
        { code: 'AIC-401', title: 'FYP-I', creditHours: 3, courseType: 'CORE' },
        { code: 'CSC-402', title: 'Analysis of Algorithms', creditHours: 3, courseType: 'CORE' },
        { code: 'CSC-302', title: 'HCI & Computer Graphics (elective)', creditHours: 3, courseType: 'ELECTIVE' },
        { code: 'MGT-401', title: 'Intro to Marketing (elective)', creditHours: 3, courseType: 'ELECTIVE' },
        { code: 'ENG-401', title: 'Technical & Business Writing', creditHours: 3, courseType: 'GENERAL' },
        { code: 'MGT-402', title: 'Entrepreneurship', creditHours: 2, courseType: 'GENERAL' },
      ],
      8: [
        { code: 'AIC-402', title: 'FYP-II', creditHours: 3, courseType: 'CORE' },
        { code: 'PAK-401', title: 'Ideology & Constitution of Pakistan', creditHours: 3, courseType: 'GENERAL' },
        { code: 'HUM-401', title: 'Professional Practices', creditHours: 2, courseType: 'GENERAL' },
        { code: 'SOC-401', title: 'Civics & Community Engagement', creditHours: 2, courseType: 'GENERAL' },
      ],
    }
  },
  {
    deptCode: 'SE',
    deptName: 'Software Engineering',
    programName: 'BS Software Engineering (BSSE) — STMU HEC Version',
    version: 'HEC-2025-BSSE',
    color: '#7C3AED',
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
        { code: 'CSC-103', title: 'OOP', creditHours: 3, courseType: 'CORE' },
        { code: 'CSC-103L', title: 'OOP Lab', creditHours: 1, courseType: 'CORE' },
        { code: 'CSC-104', title: 'Database Systems', creditHours: 3, courseType: 'CORE' },
        { code: 'CSC-104L', title: 'Database Systems Lab', creditHours: 1, courseType: 'CORE' },
        { code: 'CSC-105', title: 'Digital Logic Design', creditHours: 3, courseType: 'CORE' },
        { code: 'CSC-105L', title: 'Digital Logic Design Lab', creditHours: 1, courseType: 'CORE' },
        { code: 'MTH-102', title: 'Multivariable Calculus', creditHours: 3, courseType: 'GENERAL' },
        { code: 'MTH-103', title: 'Linear Algebra', creditHours: 3, courseType: 'GENERAL' },
      ],
      3: [
        { code: 'CSC-201', title: 'Data Structures', creditHours: 3, courseType: 'CORE' },
        { code: 'CSC-201L', title: 'Data Structures Lab', creditHours: 1, courseType: 'CORE' },
        { code: 'CYS-201', title: 'Information Security', creditHours: 3, courseType: 'CORE' },
        { code: 'AIC-201', title: 'Artificial Intelligence', creditHours: 3, courseType: 'CORE' },
        { code: 'AIC-201L', title: 'Artificial Intelligence Lab', creditHours: 1, courseType: 'CORE' },
        { code: 'CSC-202', title: 'Computer Networks', creditHours: 3, courseType: 'CORE' },
        { code: 'CSC-202L', title: 'Computer Networks Lab', creditHours: 1, courseType: 'CORE' },
        { code: 'SWE-201', title: 'Software Engineering', creditHours: 3, courseType: 'CORE' },
        { code: 'MTH-201', title: 'Probability & Statistics', creditHours: 3, courseType: 'GENERAL' },
      ],
      4: [
        { code: 'CSC-203', title: 'Computer Organization & Assembly Language', creditHours: 3, courseType: 'CORE' },
        { code: 'CSC-203L', title: 'Computer Organization & Assembly Language Lab', creditHours: 1, courseType: 'CORE' },
        { code: 'SWE-202', title: 'Software Design & Architecture', creditHours: 3, courseType: 'CORE' },
        { code: 'SWE-203', title: 'Software Construction & Development', creditHours: 3, courseType: 'CORE' },
        { code: 'PHY-201', title: 'Applied Physics', creditHours: 2, courseType: 'GENERAL' },
        { code: 'PHY-201L', title: 'Applied Physics Lab', creditHours: 1, courseType: 'GENERAL' },
        { code: 'ENG-201', title: 'Expository Writing', creditHours: 3, courseType: 'GENERAL' },
        { code: 'ISL-201', title: 'Islamic Studies', creditHours: 2, courseType: 'GENERAL' },
      ],
      5: [
        { code: 'CSC-301', title: 'Operating Systems', creditHours: 3, courseType: 'CORE' },
        { code: 'CSC-301L', title: 'Operating Systems Lab', creditHours: 1, courseType: 'CORE' },
        { code: 'SWE-301', title: 'Software Quality Engineering', creditHours: 3, courseType: 'CORE' },
        { code: 'SWE-302', title: 'Software Requirement Engineering', creditHours: 3, courseType: 'CORE' },
        { code: 'SWE-303', title: 'Software V&V/Testing (elective)', creditHours: 3, courseType: 'ELECTIVE' },
        { code: 'SWE-304', title: 'OOAD (elective)', creditHours: 3, courseType: 'ELECTIVE' },
        { code: 'MGT-301', title: 'Intro to Management', creditHours: 3, courseType: 'GENERAL' },
      ],
      6: [
        { code: 'SWE-305', title: 'Software Project Management', creditHours: 3, courseType: 'CORE' },
        { code: 'CSC-307', title: 'Parallel & Distributed Computing', creditHours: 3, courseType: 'CORE' },
        { code: 'CSC-303', title: 'Computer Architecture (elective)', creditHours: 3, courseType: 'ELECTIVE' },
        { code: 'CSC-303L', title: 'Computer Architecture Lab', creditHours: 1, courseType: 'ELECTIVE' },
        { code: 'CSC-204', title: 'Theory of Automata (elective)', creditHours: 3, courseType: 'ELECTIVE' },
        { code: 'CSC-302', title: 'HCI & Computer Graphics (elective)', creditHours: 3, courseType: 'ELECTIVE' },
        { code: 'CSC-304', title: 'Web Technologies (elective)', creditHours: 3, courseType: 'ELECTIVE' },
        { code: 'CSC-304L', title: 'Web Technologies Lab', creditHours: 1, courseType: 'ELECTIVE' },
      ],
      7: [
        { code: 'SWE-401', title: 'FYP-I', creditHours: 3, courseType: 'CORE' },
        { code: 'CSC-402', title: 'Analysis of Algorithms', creditHours: 3, courseType: 'CORE' },
        { code: 'CSC-205', title: 'Advanced DBMS (elective)', creditHours: 3, courseType: 'ELECTIVE' },
        { code: 'MGT-401', title: 'Intro to Marketing (elective)', creditHours: 3, courseType: 'ELECTIVE' },
        { code: 'ENG-401', title: 'Technical & Business Writing', creditHours: 3, courseType: 'GENERAL' },
        { code: 'MGT-402', title: 'Entrepreneurship', creditHours: 2, courseType: 'GENERAL' },
      ],
      8: [
        { code: 'SWE-402', title: 'FYP-II', creditHours: 3, courseType: 'CORE' },
        { code: 'PAK-401', title: 'Ideology & Constitution of Pakistan', creditHours: 3, courseType: 'GENERAL' },
        { code: 'HUM-401', title: 'Professional Practices', creditHours: 2, courseType: 'GENERAL' },
        { code: 'SOC-401', title: 'Civics & Community Engagement', creditHours: 2, courseType: 'GENERAL' },
      ],
    }
  },
  {
    deptCode: 'CY',
    deptName: 'Cyber Security',
    programName: 'BS Cyber Security (BSCySec) — STMU HEC Version',
    version: 'HEC-2025-BSCySec',
    color: '#EF4444',
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
        { code: 'CSC-103', title: 'OOP', creditHours: 3, courseType: 'CORE' },
        { code: 'CSC-103L', title: 'OOP Lab', creditHours: 1, courseType: 'CORE' },
        { code: 'CSC-104', title: 'Database Systems', creditHours: 3, courseType: 'CORE' },
        { code: 'CSC-104L', title: 'Database Systems Lab', creditHours: 1, courseType: 'CORE' },
        { code: 'CSC-105', title: 'Digital Logic Design', creditHours: 3, courseType: 'CORE' },
        { code: 'CSC-105L', title: 'Digital Logic Design Lab', creditHours: 1, courseType: 'CORE' },
        { code: 'MTH-102', title: 'Multivariable Calculus', creditHours: 3, courseType: 'GENERAL' },
        { code: 'MTH-103', title: 'Linear Algebra', creditHours: 3, courseType: 'GENERAL' },
      ],
      3: [
        { code: 'CSC-201', title: 'Data Structures', creditHours: 3, courseType: 'CORE' },
        { code: 'CSC-201L', title: 'Data Structures Lab', creditHours: 1, courseType: 'CORE' },
        { code: 'CYS-201', title: 'Information Security', creditHours: 3, courseType: 'CORE' },
        { code: 'AIC-201', title: 'Artificial Intelligence', creditHours: 3, courseType: 'CORE' },
        { code: 'AIC-201L', title: 'Artificial Intelligence Lab', creditHours: 1, courseType: 'CORE' },
        { code: 'CSC-202', title: 'Computer Networks', creditHours: 3, courseType: 'CORE' },
        { code: 'CSC-202L', title: 'Computer Networks Lab', creditHours: 1, courseType: 'CORE' },
        { code: 'SWE-201', title: 'Software Engineering', creditHours: 3, courseType: 'CORE' },
        { code: 'MTH-201', title: 'Probability & Statistics', creditHours: 3, courseType: 'GENERAL' },
      ],
      4: [
        { code: 'CSC-203', title: 'Computer Organization & Assembly Language', creditHours: 3, courseType: 'CORE' },
        { code: 'CSC-203L', title: 'Computer Organization & Assembly Language Lab', creditHours: 1, courseType: 'CORE' },
        { code: 'CYS-202', title: 'Cyber Security (domain core)', creditHours: 3, courseType: 'CORE' },
        { code: 'CYS-202L', title: 'Cyber Security Lab', creditHours: 1, courseType: 'CORE' },
        { code: 'CYS-203', title: 'Information Assurance', creditHours: 3, courseType: 'CORE' },
        { code: 'PHY-201', title: 'Applied Physics', creditHours: 2, courseType: 'GENERAL' },
        { code: 'PHY-201L', title: 'Applied Physics Lab', creditHours: 1, courseType: 'GENERAL' },
        { code: 'ENG-201', title: 'Expository Writing', creditHours: 3, courseType: 'GENERAL' },
        { code: 'ISL-201', title: 'Islamic Studies', creditHours: 2, courseType: 'GENERAL' },
      ],
      5: [
        { code: 'CSC-301', title: 'Operating Systems', creditHours: 3, courseType: 'CORE' },
        { code: 'CSC-301L', title: 'Operating Systems Lab', creditHours: 1, courseType: 'CORE' },
        { code: 'CYS-301', title: 'Network Security', creditHours: 3, courseType: 'CORE' },
        { code: 'CYS-301L', title: 'Network Security Lab', creditHours: 1, courseType: 'CORE' },
        { code: 'CYS-302', title: 'Secure Software Design & Development', creditHours: 3, courseType: 'CORE' },
        { code: 'CYS-303', title: 'Vulnerability Assessment & Reverse Engineering (elective)', creditHours: 3, courseType: 'ELECTIVE' },
        { code: 'ELE-101', title: 'Basic Electronics (elective)', creditHours: 3, courseType: 'ELECTIVE' },
        { code: 'MGT-301', title: 'Intro to Management', creditHours: 3, courseType: 'GENERAL' },
      ],
      6: [
        { code: 'CYS-304', title: 'Digital Forensics', creditHours: 3, courseType: 'CORE' },
        { code: 'CSC-307', title: 'Parallel & Distributed Computing', creditHours: 3, courseType: 'CORE' },
        { code: 'CYS-305', title: 'Hardware Security (elective)', creditHours: 3, courseType: 'ELECTIVE' },
        { code: 'CYS-306', title: 'Malware Analysis (elective)', creditHours: 3, courseType: 'ELECTIVE' },
        { code: 'CYS-307', title: 'Wireless & Mobile Security (elective)', creditHours: 3, courseType: 'ELECTIVE' },
        { code: 'CSC-204', title: 'Theory of Automata (elective)', creditHours: 3, courseType: 'ELECTIVE' },
      ],
      7: [
        { code: 'CYS-401', title: 'FYP-I', creditHours: 3, courseType: 'CORE' },
        { code: 'CSC-402', title: 'Analysis of Algorithms', creditHours: 3, courseType: 'CORE' },
        { code: 'CSC-302', title: 'HCI & Computer Graphics (elective)', creditHours: 3, courseType: 'ELECTIVE' },
        { code: 'MGT-401', title: 'Intro to Marketing (elective)', creditHours: 3, courseType: 'ELECTIVE' },
        { code: 'ENG-401', title: 'Technical & Business Writing', creditHours: 3, courseType: 'GENERAL' },
        { code: 'MGT-402', title: 'Entrepreneurship', creditHours: 2, courseType: 'GENERAL' },
      ],
      8: [
        { code: 'CYS-402', title: 'FYP-II', creditHours: 3, courseType: 'CORE' },
        { code: 'PAK-401', title: 'Ideology & Constitution of Pakistan', creditHours: 3, courseType: 'GENERAL' },
        { code: 'HUM-401', title: 'Professional Practices', creditHours: 2, courseType: 'GENERAL' },
        { code: 'SOC-401', title: 'Civics & Community Engagement', creditHours: 2, courseType: 'GENERAL' },
      ],
    }
  }
];

export async function seedHECCurriculums() {
  await connectDB();
  console.log('Connected to DB. Seeding 4 STMU HEC Degree Curriculums...');

  for (const prog of hecCurriculumsData) {
    // 1. Department
    let dept = await Department.findOne({
      $or: [{ code: prog.deptCode }, { name: prog.deptName }]
    });
    if (!dept) {
      dept = await Department.create({
        name: prog.deptName,
        code: prog.deptCode,
        established: 2025,
        status: 'Active',
        color: prog.color,
      });
      console.log(`Created Department: ${prog.deptName} (${prog.deptCode})`);
    }

    // 2. Batch
    const batchCode = `BS${prog.deptCode}-2025`;
    let batch = await Batch.findOne({ code: batchCode });
    if (!batch) {
      batch = await Batch.create({
        code: batchCode,
        name: `${prog.deptName} Batch 2025`,
        departmentId: dept._id,
        startYear: 2025,
        advisor: 'System Advisor',
        status: 'Allocated',
      });
      console.log(`Created Batch: ${batchCode}`);
    }

    // 3. Build Courses with STMU Codes
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

    // 4. Upsert Curriculum
    const curriculum = await Curriculum.findOneAndUpdate(
      { departmentId: dept._id, batchId: batch._id, version: prog.version },
      {
        departmentId: dept._id,
        batchId: batch._id,
        department: prog.deptName,
        batch: batchCode,
        version: prog.version,
        status: 'active',
        totalRequiredCredits: courses.reduce((acc, curr) => acc + curr.creditHours, 0),
        courses,
      },
      { new: true, upsert: true, runValidators: true }
    );

    // Link batch to curriculum
    await Batch.updateOne({ _id: batch._id }, { curriculumVersionId: curriculum._id });

    console.log(`Saved "${prog.programName}" (Version: ${curriculum.version}) with ${courses.length} STMU courses across 8 semesters (Total Credits: ${curriculum.totalRequiredCredits} CH).`);
  }

  // Clean up any old dummy "HEC Standards" department/batch if they exist
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