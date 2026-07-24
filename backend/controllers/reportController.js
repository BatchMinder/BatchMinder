import PDFDocument from 'pdfkit';
import Student from '../models/student.js';
import Batch from '../models/batch.js';
import Report from '../models/report.js';
import Transcript from '../models/transcript.js';
import { logAudit } from '../utils/logger.js';
import { STMU_GRADE_MAP } from '../utils/stmuGrading.js';

// Server-side counterpart to frontend/src/services/transcriptService.js.
// Per SDD Section 9.3, transcript/report generation should be a backend responsibility
// (PDFKit + persisted Report/Transcript records) rather than living only in the browser.
// This does not replace the client-side generator -- it gives BatchMinder an official,
// auditable generation path alongside it.

function calcSGPA(courses) {
    let totalCredits = 0;
    let totalPoints = 0;
    courses.forEach(c => {
        const pts = STMU_GRADE_MAP[c.grade]?.points;
        if (pts !== undefined) {
            const credits = c.creditHours || 3;
            totalCredits += credits;
            totalPoints += pts * credits;
        }
    });
    return totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : 'N/A';
}

function drawStudentTranscript(doc, student, batchCode) {
    doc.fontSize(16).font('Helvetica-Bold').text('BatchMinder — Official Academic Transcript', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').fillColor('#475569')
        .text(`Generated on ${new Date().toLocaleDateString()}`, { align: 'center' });
    doc.moveDown(1.5);

    doc.fillColor('#0F172A').fontSize(11).font('Helvetica-Bold').text('Student Details');
    doc.font('Helvetica').fontSize(10);
    doc.text(`Name: ${student.name}`);
    doc.text(`Roll Number: ${student.rollNumber}`);
    doc.text(`Batch: ${batchCode || 'N/A'}`);
    doc.text(`Current Semester: ${student.currentSemester}`);
    doc.text(`Overall CGPA: ${student.cgpa != null ? student.cgpa.toFixed(2) : 'N/A'}`);
    doc.moveDown(1);

    const coursesBySemester = {};
    (student.courses || []).forEach(c => {
        const sem = c.semester || 1;
        if (!coursesBySemester[sem]) coursesBySemester[sem] = [];
        coursesBySemester[sem].push(c);
    });

    Object.keys(coursesBySemester).sort((a, b) => Number(a) - Number(b)).forEach(sem => {
        const semCourses = coursesBySemester[sem];
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#1E3A8A')
            .text(`Semester ${sem}  (SGPA: ${calcSGPA(semCourses)})`);
        doc.moveDown(0.3);

        doc.fontSize(9).font('Helvetica-Bold').fillColor('#334155');
        const startY = doc.y;
        doc.text('Code', 50, startY, { width: 80 });
        doc.text('Course Title', 130, startY, { width: 220 });
        doc.text('Credits', 350, startY, { width: 60 });
        doc.text('Grade', 410, startY, { width: 60 });
        doc.moveDown(0.5);
        doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#CBD5E1').stroke();
        doc.moveDown(0.3);

        doc.font('Helvetica').fillColor('#0F172A');
        semCourses.forEach(c => {
            const rowY = doc.y;
            doc.text(c.courseCode || 'N/A', 50, rowY, { width: 80 });
            doc.text(c.courseTitle || 'N/A', 130, rowY, { width: 220 });
            doc.text(String(c.creditHours || 3), 350, rowY, { width: 60 });
            doc.text(c.grade || 'IP', 410, rowY, { width: 60 });
            doc.moveDown(0.6);
        });
        doc.moveDown(0.7);
    });
}

// GET /api/reports/transcript/:studentId — one-click single student transcript (FE-35/FR-6.4)
export const generateStudentTranscript = async (req, res, next) => {
    try {
        const student = await Student.findById(req.params.studentId);
        if (!student) {
            return res.status(404).json({ status: 'error', message: 'Student not found' });
        }
        const batch = await Batch.findById(student.batchId);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="Transcript_${student.rollNumber}.pdf"`);

        const doc = new PDFDocument({ margin: 50 });
        doc.pipe(res);
        drawStudentTranscript(doc, student, batch?.code);
        doc.end();

        await Transcript.create({
            studentId: student._id,
            overallCGPA: student.cgpa || 0,
            generatedBy: req.user._id,
        });

        await logAudit({
            actorId: req.user._id,
            actorRole: req.user.role,
            action: 'TRANSCRIPT_GENERATED',
            targetType: 'Student',
            targetId: student._id.toString(),
            departmentId: student.departmentId?.toString(),
            batchId: student.batchId?.toString(),
            metadata: { description: `Transcript generated for ${student.rollNumber}` }
        });
    } catch (err) {
        next(err);
    }
};

// GET /api/reports/transcript/batch/:batchId — one-click batch transcript (FE-35/FR-6.4)
// Combines every student's transcript in the batch into a single multi-page PDF.
export const generateBatchTranscripts = async (req, res, next) => {
    try {
        const batch = await Batch.findById(req.params.batchId);
        if (!batch) {
            return res.status(404).json({ status: 'error', message: 'Batch not found' });
        }
        const students = await Student.find({ batchId: batch._id }).sort({ rollNumber: 1 });
        if (students.length === 0) {
            return res.status(404).json({ status: 'error', message: 'No students found in this batch' });
        }

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="Batch_Transcripts_${batch.code}.pdf"`);

        const doc = new PDFDocument({ margin: 50 });
        doc.pipe(res);

        students.forEach((student, idx) => {
            if (idx > 0) doc.addPage();
            drawStudentTranscript(doc, student, batch.code);
        });

        doc.end();

        await Transcript.insertMany(students.map(s => ({
            studentId: s._id,
            overallCGPA: s.cgpa || 0,
            generatedBy: req.user._id,
        })));

        await Report.create({
            batchId: batch._id,
            reportType: 'BATCH_SUMMARY',
            generatedBy: req.user._id,
        });

        await logAudit({
            actorId: req.user._id,
            actorRole: req.user.role,
            action: 'BATCH_TRANSCRIPTS_GENERATED',
            targetType: 'Batch',
            targetId: batch._id.toString(),
            departmentId: batch.departmentId?.toString(),
            batchId: batch._id.toString(),
            metadata: { description: `Batch transcripts generated for ${batch.code}`, count: students.length }
        });
    } catch (err) {
        next(err);
    }
};

// POST /api/reports/batch-summary — configurable batch academic report (FR-6.1)
// Persists a Report record (per SDD §9.2) and returns the aggregated data used to build it.
export const generateBatchSummaryReport = async (req, res, next) => {
    try {
        const { batchId, semester, academicYear, cgpaRange, enrollmentStatus } = req.body;
        if (!batchId) {
            return res.status(400).json({ status: 'error', message: 'batchId is required' });
        }

        const batch = await Batch.findById(batchId);
        if (!batch) {
            return res.status(404).json({ status: 'error', message: 'Batch not found' });
        }

        const query = { batchId };
        if (semester) query.currentSemester = Number(semester);
        if (enrollmentStatus) query.status = enrollmentStatus;
        if (cgpaRange) {
            const [min, max] = cgpaRange.split('-').map(Number);
            if (!Number.isNaN(min) && !Number.isNaN(max)) {
                query.cgpa = { $gte: min, $lte: max };
            }
        }

        const students = await Student.find(query);
        const summary = {
            totalStudents: students.length,
            averageCGPA: students.length > 0
                ? (students.reduce((sum, s) => sum + (s.cgpa || 0), 0) / students.length).toFixed(2)
                : 'N/A',
            warningCount: students.filter(s => s.cgpaStatus === 'warning').length,
            criticalCount: students.filter(s => s.cgpaStatus === 'critical').length,
            goodStandingCount: students.filter(s => s.cgpaStatus === 'good').length,
        };

        const report = await Report.create({
            batchId,
            reportType: 'BATCH_SUMMARY',
            parameters: { semester, academicYear, cgpaRange, enrollmentStatus },
            generatedBy: req.user._id,
        });

        res.status(200).json({
            status: 'success',
            data: { reportId: report._id, batch: batch.code, summary }
        });
    } catch (err) {
        next(err);
    }
};

// GET /api/reports/history — list previously generated reports/transcripts (audit visibility)
export const getReportHistory = async (req, res, next) => {
    try {
        const reports = await Report.find({}).sort({ createdAt: -1 }).limit(100)
            .populate('batchId', 'code')
            .populate('generatedBy', 'name email');
        res.status(200).json({ status: 'success', data: { reports } });
    } catch (err) {
        next(err);
    }
};
