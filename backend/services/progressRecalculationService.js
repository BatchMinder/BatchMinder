import Student from '../models/student.js';
import Curriculum from '../models/curriculum.js';
import DegreeProgress from '../models/degreeProgress.js';

export const recalculateProgress = async (studentId) => {
  try {
    const student = await Student.findById(studentId);
    if (!student || !student.curriculumID) return;

    const curriculum = await Curriculum.findById(student.curriculumID).populate('courses');
    if (!curriculum) return;

    let completedCredits = 0;
    const completedCoursesSet = new Set();
    const passedGrades = ['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'P'];

    // 1. Evaluate Student Course History
    student.courses.forEach(c => {
      // Treat exempt or passed courses as completed
      if (c.status === 'completed' || passedGrades.includes(c.grade) || c.grade === 'Exempted') {
        completedCredits += c.creditHours;
        completedCoursesSet.add(c.courseCode);
      }
    });

    const totalRequiredCredits = curriculum.totalRequiredCredits || 130;
    const remainingCredits = Math.max(0, totalRequiredCredits - completedCredits);
    const completionPercentage = (completedCredits / totalRequiredCredits) * 100;

    // 2. Identify Missing Core Courses
    const coreCourses = curriculum.courses.filter(c => c.courseType === 'CORE');
    const missingCoreCourses = coreCourses
      .filter(c => !completedCoursesSet.has(c.code))
      .map(c => c.code);

    // 3. Identify Backlog (failed courses)
    const backlog = student.courses
      .filter(c => c.status === 'failed' || c.grade === 'F')
      .map(c => c.courseCode);

    // 4. Update or Create DegreeProgress Record
    await DegreeProgress.findOneAndUpdate(
      { studentId: student._id },
      {
        completedCredits,
        remainingCredits,
        completionPercentage: Number(completionPercentage.toFixed(2)),
        missingCoreCourses,
        backlog,
      },
      { upsert: true, new: true }
    );
    
    console.log(`Successfully recalculated progress for student ${student.rollNumber}`);
  } catch (err) {
    console.error('Error recalculating progress:', err);
  }
};
