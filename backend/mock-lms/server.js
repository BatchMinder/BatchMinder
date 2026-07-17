// MOCK LMS SERVER
// Simulates a university LMS's external API for FR-2.3 (LMS/ERP Synchronization).
// This stands in for a real system we don't have access to (no real university
// grants API credentials to student FYP teams). BatchMinder's real backend
// calls this over actual HTTP with an API key, exactly like it would call a
// genuine LMS — the integration pattern itself is real, only the data source
// is simulated.
//
// Run separately from the main backend: node mock-lms/server.js
// Requires the MOCK_LMS_API_KEY env var to match what the main backend sends.

import express from 'express';
import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.MOCK_LMS_PORT || 6000;
const API_KEY = process.env.MOCK_LMS_API_KEY;

if (!API_KEY) {
    console.error('MOCK_LMS_API_KEY is not set — refusing to start (fail closed, no unauthenticated LMS).');
    process.exit(1);
}

const GRADES = ['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C'];

// Deterministic pseudo-random grade per (rollNumber, courseCode) pair, so
// repeated syncs return the same result instead of flapping randomly.
const deterministicGrade = (seed) => {
    const hash = crypto.createHash('md5').update(seed).digest('hex');
    const idx = parseInt(hash.slice(0, 4), 16) % GRADES.length;
    return GRADES[idx];
};

const requireApiKey = (req, res, next) => {
    const key = req.headers['x-api-key'];
    if (!key || key !== API_KEY) {
        return res.status(401).json({ status: 'error', message: 'Invalid or missing API key.' });
    }
    next();
};

app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'mock-lms' });
});

// POST /api/mock-lms/sync
// body: { rollNumber: string, courseCodes: string[] }
// Simulates the LMS returning current grade/attendance/status for each
// course code, as if that student's LMS record was queried live.
app.post('/api/mock-lms/sync', requireApiKey, (req, res) => {
    const { rollNumber, courseCodes } = req.body;

    if (!rollNumber || !Array.isArray(courseCodes) || courseCodes.length === 0) {
        return res.status(400).json({ status: 'error', message: 'rollNumber and courseCodes[] are required.' });
    }

    const results = courseCodes.map((courseCode) => {
        const seed = `${rollNumber}:${courseCode}`;
        return {
            courseCode,
            grade: deterministicGrade(seed),
            status: 'completed'
        };
    });

    res.status(200).json({ status: 'success', rollNumber, results });
});

app.listen(PORT, () => {
    console.log(`Mock LMS server running on port ${PORT}`);
});