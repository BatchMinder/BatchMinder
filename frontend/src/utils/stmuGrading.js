// frontend/src/utils/stmuGrading.js
// Frontend mirror of backend/utils/stmuGrading.js — kept as the ONE frontend
// source of truth for grade points. Previously AcademicSummary.jsx and
// transcriptService.js each kept their own separate copy of this table
// (both using the wrong generic .7/.3 scale instead of STMU's real .66/.33
// scale), which is what caused the same student's CGPA to display
// differently in different tabs. Both files now import from here instead.
//
// IMPORTANT: if these values ever need to change, update
// backend/utils/stmuGrading.js's STMU_GRADE_MAP too — the two are not
// automatically synced across the frontend/backend boundary.

export const GRADE_POINTS = {
  'A': 4.00,
  'A-': 3.66,
  'B+': 3.33,
  'B': 3.00,
  'B-': 2.66,
  'C+': 2.33,
  'C': 2.00,
  'C-': 1.66,
  'D+': 1.33,
  'D': 1.00,
  'F': 0.00,
};

/**
 * Calculate GPA (SGPA or CGPA depending on the course list passed in) for a
 * list of courses. Returns 'N/A' if there's nothing graded yet (e.g. an
 * all-IP semester) — this is a real "nothing to compute" state, not a
 * hardcoded suppression for any specific semester number.
 */
export function calculateGPA(courses) {
  let totalCredits = 0;
  let totalGradePoints = 0;
  let hasGraded = false;

  (courses || []).forEach(c => {
    if (c.grade && GRADE_POINTS[c.grade] !== undefined) {
      const cr = c.creditHours || c.credits || 3;
      totalCredits += cr;
      totalGradePoints += cr * GRADE_POINTS[c.grade];
      hasGraded = true;
    }
  });

  if (!hasGraded || totalCredits === 0) return 'N/A';
  return (totalGradePoints / totalCredits).toFixed(2);
}