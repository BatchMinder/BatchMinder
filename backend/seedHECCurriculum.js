import dotenv from 'dotenv';
import connectDB from './utils/db.js';
import Department from './models/department.js';
import Batch from './models/batch.js';
import Curriculum from './models/curriculum.js';

dotenv.config();

// Sourced directly from: HEC/NCRC/CS&IT/2025/8163 — "Curriculum of BS Computer
// Science (2025)", Scheme of Studies, Semester I-VIII (compulsory courses only).
// Credit hours below are the TOTAL credit hours as printed in the doc
// (e.g. "4 (3+1)" -> 4). Specialization electives are NOT included here since
// they don't map to a fixed semester (students pick 8 of ~15 per track) --
// ask if you want those seeded separately as an elective pool.

const semesters = {
    1: [
        { title: 'Quantitative Reasoning-I', creditHours: 3, category: 'GE' },
        { title: 'Functional English', creditHours: 3, category: 'GE' },
        { title: 'Applications of Information and Communication Technologies', creditHours: 3, category: 'GE' },
        { title: 'Social Science', creditHours: 2, category: 'GE' },
        { title: 'Programming Fundamentals', creditHours: 4, category: 'CS' },
        { title: 'Calculus & Analytical Geometry (IDS I)', creditHours: 3, category: 'IDS' },
    ],
    2: [
        { title: 'Quantitative Reasoning-II', creditHours: 3, category: 'GE' },
        { title: 'Arts and Humanities', creditHours: 2, category: 'GE' },
        { title: 'Pakistan Studies', creditHours: 2, category: 'GE' },
        { title: 'Fehm-e-Quran – I', creditHours: 1, category: 'GE' },
        { title: 'Object Oriented Programming', creditHours: 4, category: 'CS' },
        { title: 'Digital Logic Design', creditHours: 4, category: 'CS' },
        { title: 'Linear Algebra (IDS II)', creditHours: 3, category: 'IDS' },
    ],
    3: [
        { title: 'Expository Writing', creditHours: 3, category: 'GE' },
        { title: 'Natural Science', creditHours: 3, category: 'GE' },
        { title: 'Fehm-e-Quran – II', creditHours: 1, category: 'GE' },
        { title: 'Data Structures', creditHours: 4, category: 'CS' },
        { title: 'Database Systems', creditHours: 4, category: 'CS' },
        { title: 'Operating Systems', creditHours: 4, category: 'CS' },
    ],
    4: [
        { title: 'Civics and Community Engagement', creditHours: 2, category: 'GE' },
        { title: 'Ideology and Constitution of Pakistan', creditHours: 2, category: 'GE' },
        { title: 'Entrepreneurship', creditHours: 2, category: 'GE' },
        { title: 'Islamic Studies / Ethics', creditHours: 2, category: 'GE' },
        { title: 'Software Engineering', creditHours: 3, category: 'CS' },
        { title: 'Computer Organization & Architecture', creditHours: 3, category: 'CS' },
        { title: 'Design & Analysis of Algorithms', creditHours: 3, category: 'CS' },
    ],
    5: [
        { title: 'Computer Networks', creditHours: 3, category: 'CS' },
        { title: 'Information Security', creditHours: 3, category: 'CS' },
        { title: 'Artificial Intelligence', creditHours: 3, category: 'CS' },
        { title: 'Theory of Automata', creditHours: 3, category: 'CS' },
        { title: 'IDS - III', creditHours: 3, category: 'IDS' },
        { title: 'IDS - IV', creditHours: 3, category: 'IDS' },
    ],
    6: [
        { title: 'Cloud Computing', creditHours: 3, category: 'CS' },
        { title: 'Elective-I', creditHours: 3, category: 'CS' },
        { title: 'Elective-II', creditHours: 3, category: 'CS' },
        { title: 'Elective-III', creditHours: 3, category: 'CS' },
        { title: 'Elective-IV', creditHours: 3, category: 'CS' },
    ],
    7: [
        { title: 'Elective-V', creditHours: 3, category: 'CS' },
        { title: 'Elective-VI', creditHours: 3, category: 'CS' },
        { title: 'Elective-VII', creditHours: 3, category: 'CS' },
        { title: 'Elective-VIII', creditHours: 3, category: 'CS' },
        { title: 'Professional Certification', creditHours: 3, category: 'CERT' },
    ],
    8: [
        { title: 'Final Year Project', creditHours: 6, category: 'FYP' },
        { title: 'Field Experience / Internship', creditHours: 3, category: 'INT' },
    ],
};

function buildCourses() {
    const counters = {};
    const courses = [];

    for (const [sem, list] of Object.entries(semesters)) {
        const semester = Number(sem);
        for (const c of list) {
            counters[c.category] = (counters[c.category] || 0) + 1;
            const code = `${c.category}-${100 + counters[c.category]}`;
            courses.push({
                code,
                title: c.title,
                creditHours: c.creditHours,
                semester,
            });
        }
    }
    return courses;
}

async function run() {
    await connectDB();
    console.log('Connected. Seeding HEC BS Computer Science (2025) curriculum...');

    let hecDept = await Department.findOne({ code: 'HEC' });
    if (!hecDept) {
        hecDept = await Department.create({
            name: 'HEC Standards',
            code: 'HEC',
            established: 2025,
            color: '#10B981',
        });
        console.log('Created Department: HEC Standards');
    }

    let hecBatch = await Batch.findOne({ code: 'HEC-2025' });
    if (!hecBatch) {
        hecBatch = await Batch.create({
            code: 'HEC-2025',
            departmentId: hecDept._id,
            startYear: 2025,
            advisor: 'System',
        });
        console.log('Created Batch: HEC-2025');
    }

    const courses = buildCourses();

    const curriculum = await Curriculum.findOneAndUpdate(
        { departmentId: hecDept._id, batchId: hecBatch._id, version: 'HEC-2025-BSCS' },
        {
            departmentId: hecDept._id,
            batchId: hecBatch._id,
            department: 'HEC Standards',
            batch: 'HEC-2025',
            version: 'HEC-2025-BSCS',
            status: 'active',
            courses,
        },
        { new: true, upsert: true, runValidators: true }
    );

    console.log(`Saved curriculum "${curriculum.version}" with ${curriculum.courses.length} courses.`);
    courses.forEach(c => console.log(`  Sem ${c.semester}: [${c.code}] ${c.title} (${c.creditHours} CH)`));

    process.exit(0);
}

run().catch(err => {
    console.error('Seeding failed:', err);
    process.exit(1);
});