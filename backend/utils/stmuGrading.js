// backend/utils/stmuGrading.js
// Official STMU Grading Scale, GPA Calculation Formula, & Migrated Student Semester Placement

export const STMU_GRADE_MAP = {
  'A':  { points: 4.0, minPercentage: 85, maxPercentage: 100, label: '85 - 100%' },
  'A-': { points: 3.7, minPercentage: 80, maxPercentage: 84,  label: '80 - 84%' },
  'B+': { points: 3.3, minPercentage: 75, maxPercentage: 79,  label: '75 - 79%' },
  'B':  { points: 3.0, minPercentage: 71, maxPercentage: 74,  label: '71 - 74%' },
  'B-': { points: 2.7, minPercentage: 68, maxPercentage: 70,  label: '68 - 70%' },
  'C+': { points: 2.3, minPercentage: 64, maxPercentage: 67,  label: '64 - 67%' },
  'C':  { points: 2.0, minPercentage: 61, maxPercentage: 63,  label: '61 - 63%' },
  'C-': { points: 1.7, minPercentage: 58, maxPercentage: 60,  label: '58 - 60%' },
  'D':  { points: 1.0, minPercentage: 50, maxPercentage: 57,  label: '50 - 57%' },
  'F':  { points: 0.0, minPercentage: 0,  maxPercentage: 49,  label: 'Below 50%' },
};

/**
 * Given marks or percentage (0-100), return STMU letter grade and GPA points
 */
export function getSTMUGradeFromPercentage(pct) {
  const score = Math.round(Number(pct) || 0);
  if (score >= 85) return { grade: 'A', points: 4.0 };
  if (score >= 80) return { grade: 'A-', points: 3.7 };
  if (score >= 75) return { grade: 'B+', points: 3.3 };
  if (score >= 71) return { grade: 'B', points: 3.0 };
  if (score >= 68) return { grade: 'B-', points: 2.7 };
  if (score >= 64) return { grade: 'C+', points: 2.3 };
  if (score >= 61) return { grade: 'C', points: 2.0 };
  if (score >= 58) return { grade: 'C-', points: 1.7 };
  if (score >= 50) return { grade: 'D', points: 1.0 };
  return { grade: 'F', points: 0.0 };
}

/**
 * Get GPA points from letter grade
 */
export function getPointsFromGrade(letterGrade) {
  const cleanGrade = (letterGrade || '').toUpperCase().trim();
  if (STMU_GRADE_MAP[cleanGrade] !== undefined) {
    return STMU_GRADE_MAP[cleanGrade].points;
  }
  return 0.0;
}

/**
 * STMU Cumulative Grade Point Average (CGPA) Formula:
 * CGPA = Sum(Grade Points * Credit Hours) / Sum(Credit Hours)
 */
export function calculateSTMU_CGPA(courses) {
  let totalQualityPoints = 0;
  let totalAttemptedCredits = 0;

  for (const c of courses || []) {
    if (!c || !c.grade || c.grade === 'IP' || c.grade === 'Exempted' || c.grade === 'P' || c.grade === '—') continue;
    const pts = getPointsFromGrade(c.grade);
    const cr = Number(c.creditHours || c.credits) || 0;
    if (cr > 0 && pts !== undefined) {
      totalQualityPoints += pts * cr;
      totalAttemptedCredits += cr;
    }
  }

  if (totalAttemptedCredits === 0) return 0.00;
  return Number((totalQualityPoints / totalAttemptedCredits).toFixed(2));
}

/**
 * Calculate STMU Current Semester Placement for Migrated Student based on Accepted Transferred Credit Hours
 * 0 - 15 CH  -> Semester 1
 * 16 - 32 CH -> Semester 2
 * 33 - 49 CH -> Semester 3
 * 50 - 66 CH -> Semester 4
 * 67 - 83 CH -> Semester 5
 * 84 - 100 CH -> Semester 6
 * 101 - 116 CH -> Semester 7
 * 117+ CH    -> Semester 8
 */
export function calculateMigratedStudentSemester(acceptedCredits) {
  const cr = Number(acceptedCredits) || 0;
  const sem = Math.min(8, Math.max(1, Math.floor(cr / 16) + 1));
  return sem;
}
