// transcriptService.js
// Handles client-side PDF Transcript Generation (FR-6.4) for single students and batches.

const gradePoints = {
  'A': 4.0,
  'A-': 3.7,
  'B+': 3.3,
  'B': 3.0,
  'B-': 2.7,
  'C+': 2.3,
  'C': 2.0,
  'C-': 1.7,
  'D': 1.0,
  'F': 0.0
};

// Calculate SGPA for a list of courses in a semester
const calculateSGPA = (courses) => {
  let totalCredits = 0;
  let totalGradePoints = 0;
  let hasGraded = false;

  courses.forEach(c => {
    if (c.grade && gradePoints[c.grade] !== undefined) {
      const cr = c.creditHours || c.credits || 3;
      totalCredits += cr;
      totalGradePoints += cr * gradePoints[c.grade];
      hasGraded = true;
    }
  });

  if (!hasGraded || totalCredits === 0) return 'N/A';
  return (totalGradePoints / totalCredits).toFixed(2);
};

// Generate HTML Content for a Student Transcript
const generateTranscriptHtml = (student) => {
  // Group courses by semester
  const coursesBySemester = {};
  const courses = student.courses || [];
  
  courses.forEach(c => {
    const sem = c.semester || 1;
    if (!coursesBySemester[sem]) coursesBySemester[sem] = [];
    coursesBySemester[sem].push(c);
  });

  const semestersHtml = Object.keys(coursesBySemester)
    .sort((a, b) => Number(a) - Number(b))
    .map(sem => {
      const semCourses = coursesBySemester[sem];
      const sgpa = calculateSGPA(semCourses);
      
      const rowsHtml = semCourses.map(c => `
        <tr class="course-row">
          <td class="code">${c.courseCode || 'N/A'}</td>
          <td class="title">${c.courseTitle || 'N/A'}</td>
          <td class="credits">${c.creditHours || c.credits || 3}</td>
          <td class="grade">${c.grade || 'IP'}</td>
          <td class="points">${c.grade && gradePoints[c.grade] !== undefined ? (gradePoints[c.grade] * (c.creditHours || 3)).toFixed(1) : '—'}</td>
        </tr>
      `).join('');

      return `
        <div class="semester-section">
          <div class="semester-header">
            <span>SEMESTER ${sem}</span>
            <span>SGPA: ${sgpa}</span>
          </div>
          <table class="courses-table">
            <thead>
              <tr>
                <th style="width: 15%;">Course Code</th>
                <th style="width: 55%;">Course Title</th>
                <th style="width: 10%;">Cr. Hrs</th>
                <th style="width: 10%;">Grade</th>
                <th style="width: 10%;">Points</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>
      `;
    }).join('');

  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const totalCreditsEarned = courses
    .filter(c => c.status === 'completed' || c.enrollmentStatus === 'completed')
    .reduce((sum, c) => sum + (c.creditHours || 3), 0);

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Official Academic Transcript - ${student.name}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;800&family=Inter:wght@400;600;700;800&display=swap');
        
        body {
          font-family: 'Inter', sans-serif;
          color: #0f172a;
          line-height: 1.4;
          margin: 0;
          padding: 40px;
          background: #ffffff;
        }

        .transcript-container {
          max-width: 800px;
          margin: 0 auto;
          position: relative;
        }

        /* Watermark */
        .watermark {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-30deg);
          font-family: 'Cinzel', serif;
          font-size: 70px;
          font-weight: 800;
          color: rgba(241, 245, 249, 0.6);
          pointer-events: none;
          z-index: 0;
          white-space: nowrap;
          letter-spacing: 5px;
        }

        header {
          text-align: center;
          border-bottom: 3px double #1e3a8a;
          padding-bottom: 20px;
          margin-bottom: 25px;
          position: relative;
          z-index: 1;
        }

        .university-logo-placeholder {
          width: 60px;
          height: 60px;
          background: linear-gradient(135deg, #1e3a8a, #3b82f6);
          border-radius: 50%;
          margin: 0 auto 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Cinzel', serif;
          color: #ffffff;
          font-weight: 800;
          font-size: 24px;
        }

        h1 {
          font-family: 'Cinzel', serif;
          margin: 0 0 5px;
          font-size: 24px;
          color: #1e3a8a;
          letter-spacing: 0.5px;
        }

        .sub-header {
          font-size: 11px;
          color: #64748b;
          text-transform: uppercase;
          font-weight: 700;
          letter-spacing: 1.5px;
        }

        .doc-title {
          font-family: 'Cinzel', serif;
          font-size: 18px;
          font-weight: 800;
          color: #0f172a;
          margin: 15px 0 0;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .student-info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 15px 20px;
          margin-bottom: 25px;
          font-size: 12px;
          position: relative;
          z-index: 1;
        }

        .info-item {
          display: flex;
          justify-content: space-between;
          border-bottom: 1px dashed #e2e8f0;
          padding: 4px 0;
        }

        .info-item:last-child {
          border-bottom: none;
        }

        .info-label {
          color: #64748b;
          font-weight: 600;
        }

        .info-value {
          font-weight: 700;
          color: #0f172a;
        }

        .semester-section {
          margin-bottom: 25px;
          page-break-inside: avoid;
          position: relative;
          z-index: 1;
        }

        .semester-header {
          background: #1e3a8a;
          color: #ffffff;
          font-size: 12px;
          font-weight: 800;
          padding: 6px 12px;
          border-radius: 6px 6px 0 0;
          display: flex;
          justify-content: space-between;
          text-transform: uppercase;
        }

        .courses-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11px;
        }

        .courses-table th {
          background: #f1f5f9;
          border-bottom: 1px solid #cbd5e1;
          color: #475569;
          font-weight: 700;
          text-align: left;
          padding: 8px 12px;
          text-transform: uppercase;
        }

        .courses-table td {
          border-bottom: 1px solid #e2e8f0;
          padding: 8px 12px;
        }

        .course-row:hover {
          background: #f8fafc;
        }

        .code {
          font-family: monospace;
          font-weight: 700;
        }

        .title {
          font-weight: 500;
        }

        .credits, .grade, .points {
          font-weight: 700;
        }

        .summary-block {
          background: #1e3a8a;
          color: #ffffff;
          border-radius: 10px;
          padding: 15px 20px;
          display: flex;
          justify-content: space-around;
          font-size: 14px;
          font-weight: 800;
          margin-top: 30px;
          page-break-inside: avoid;
          position: relative;
          z-index: 1;
        }

        .summary-item {
          text-align: center;
        }

        .summary-lbl {
          font-size: 10px;
          opacity: 0.8;
          text-transform: uppercase;
          margin-bottom: 4px;
          display: block;
        }

        footer {
          margin-top: 50px;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          font-size: 11px;
          color: #64748b;
          page-break-inside: avoid;
          position: relative;
          z-index: 1;
        }

        .signature-block {
          text-align: center;
          width: 180px;
        }

        .sig-line {
          border-top: 1px solid #94a3b8;
          margin-top: 40px;
          padding-top: 5px;
          font-weight: 700;
        }

        .stamp-block {
          width: 100px;
          height: 100px;
          border: 2px dashed #94a3b8;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 10px;
          text-transform: uppercase;
          opacity: 0.6;
        }

        /* Print styles */
        @media print {
          body {
            padding: 0;
            background: #ffffff;
          }
          
          .semester-section {
            page-break-inside: avoid;
          }
          
          .watermark {
            color: rgba(226, 232, 240, 0.4) !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          .semester-header {
            background-color: #1e3a8a !important;
            color: #ffffff !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          .summary-block {
            background-color: #1e3a8a !important;
            color: #ffffff !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      </style>
    </head>
    <body>
      <div class="transcript-container">
        <div class="watermark">OFFICIAL TRANSCRIPT</div>
        
        <header>
          <div class="university-logo-placeholder">BM</div>
          <h1>BatchMinder Institute of Technology</h1>
          <div class="sub-header">Chartered by the Higher Education Commission • Department of Computer Science</div>
          <div class="doc-title">Official Academic Transcript</div>
        </header>

        <div class="student-info-grid">
          <div>
            <div class="info-item">
              <span class="info-label">Student Name:</span>
              <span class="info-value">${student.name}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Roll Number:</span>
              <span class="info-value">${student.rollNumber || student.studentID || student.id}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Degree Program:</span>
              <span class="info-value">Bachelor of Science in Computer Science</span>
            </div>
          </div>
          <div>
            <div class="info-item">
              <span class="info-label">Issue Date:</span>
              <span class="info-value">${today}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Academic Status:</span>
              <span class="info-value" style="color: ${student.status === 'Good' || student.cgpaStatus === 'good_standing' ? '#047857' : '#b91c1c'}">
                ${student.status === 'Good' || student.cgpaStatus === 'good_standing' ? 'Good Standing' : student.status || 'Active'}
              </span>
            </div>
            <div class="info-item">
              <span class="info-label">Department:</span>
              <span class="info-value">Computer Science</span>
            </div>
          </div>
        </div>

        ${semestersHtml}

        <div class="summary-block">
          <div class="summary-item">
            <span class="summary-lbl">Total Credits Earned</span>
            <span>${totalCreditsEarned} CH</span>
          </div>
          <div class="summary-item">
            <span class="summary-lbl">Cumulative CGPA</span>
            <span>${(student.cgpa || 0.00).toFixed(2)}</span>
          </div>
          <div class="summary-item">
            <span class="summary-lbl">Standing</span>
            <span>${student.cgpa >= 2.0 ? 'PASSED' : 'PROBATION'}</span>
          </div>
        </div>

        <footer>
          <div class="stamp-block">
            Official Seal
          </div>
          <div class="signature-block">
            <div class="sig-line">Registrar</div>
          </div>
          <div class="signature-block">
            <div class="sig-line">Controller of Examinations</div>
          </div>
        </footer>
      </div>
    </body>
    </html>
  `;
};

// Print/Download single student transcript
export const downloadSingleTranscript = async (studentId) => {
  try {
    // 1. Attempt to fetch details of student
    let student = null;
    let url = `/api/students/${studentId}`;
    let res = await fetch(url);
    if (!res.ok) {
      // Fallback for advisor scope
      url = `/api/advisor/students/${studentId}`;
      res = await fetch(url);
    }
    
    if (res.ok) {
      const payload = await res.json();
      student = payload.data?.student || payload.data || payload;
    } else {
      throw new Error('Failed to fetch student data');
    }

    if (!student) throw new Error('Student data empty');

    // 2. Open print iframe or new window and write HTML content
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Pop-up blocked. Please allow popups to generate transcripts.');
      return;
    }

    printWindow.document.write(generateTranscriptHtml(student));
    printWindow.document.close();
    printWindow.focus();

    // Trigger printing after styles render
    setTimeout(() => {
      printWindow.print();
    }, 500);

  } catch (err) {
    console.error('Error generating transcript:', err);
    alert('Failed to generate academic transcript. Check server connections.');
  }
};

// Print/Download multiple transcripts sequentially in a single print job
export const downloadBatchTranscripts = async (studentIds) => {
  if (!studentIds || studentIds.length === 0) {
    alert('No students selected for batch transcript generation.');
    return;
  }

  try {
    const fetchPromises = studentIds.map(async (id) => {
      let res = await fetch(`/api/students/${id}`);
      if (!res.ok) res = await fetch(`/api/advisor/students/${id}`);
      const payload = await res.json();
      return payload.data?.student || payload.data || payload;
    });

    const students = await Promise.all(fetchPromises);

    // Merge HTML templates separating by print page breaks
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Pop-up blocked. Please allow popups to generate transcripts.');
      return;
    }

    const mergedTranscriptsHtml = students
      .map((student) => {
        const doc = generateTranscriptHtml(student);
        // Extract inner content from body
        const parser = new DOMParser();
        const htmlDoc = parser.parseFromString(doc, 'text/html');
        return `<div class="batch-page" style="page-break-after: always; padding: 40px 0;">${htmlDoc.querySelector('.transcript-container').outerHTML}</div>`;
      })
      .join('');

    // Wrap in standard layout styles
    const fullHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Batch Academic Transcripts</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;800&family=Inter:wght@400;600;700;800&display=swap');
          body {
            font-family: 'Inter', sans-serif;
            background: #ffffff;
            margin: 0;
            padding: 0;
          }
          /* Copy necessary styles inside child */
          .transcript-container {
            max-width: 800px;
            margin: 0 auto;
            position: relative;
            background: #ffffff;
            page-break-inside: avoid;
          }
          .watermark {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-30deg);
            font-family: 'Cinzel', serif;
            font-size: 70px;
            font-weight: 800;
            color: rgba(241, 245, 249, 0.6);
            pointer-events: none;
            z-index: 0;
            white-space: nowrap;
            letter-spacing: 5px;
          }
          header {
            text-align: center;
            border-bottom: 3px double #1e3a8a;
            padding-bottom: 20px;
            margin-bottom: 25px;
            position: relative;
            z-index: 1;
          }
          .university-logo-placeholder {
            width: 60px;
            height: 60px;
            background: linear-gradient(135deg, #1e3a8a, #3b82f6);
            border-radius: 50%;
            margin: 0 auto 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: 'Cinzel', serif;
            color: #ffffff;
            font-weight: 800;
            font-size: 24px;
          }
          h1 {
            font-family: 'Cinzel', serif;
            margin: 0 0 5px;
            font-size: 24px;
            color: #1e3a8a;
            letter-spacing: 0.5px;
          }
          .sub-header {
            font-size: 11px;
            color: #64748b;
            text-transform: uppercase;
            font-weight: 700;
            letter-spacing: 1.5px;
          }
          .doc-title {
            font-family: 'Cinzel', serif;
            font-size: 18px;
            font-weight: 800;
            color: #0f172a;
            margin: 15px 0 0;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .student-info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 15px 20px;
            margin-bottom: 25px;
            font-size: 12px;
          }
          .info-item {
            display: flex;
            justify-content: space-between;
            border-bottom: 1px dashed #e2e8f0;
            padding: 4px 0;
          }
          .info-item:last-child {
            border-bottom: none;
          }
          .info-label {
            color: #64748b;
            font-weight: 600;
          }
          .info-value {
            font-weight: 700;
            color: #0f172a;
          }
          .semester-section {
            margin-bottom: 25px;
            page-break-inside: avoid;
          }
          .semester-header {
            background: #1e3a8a;
            color: #ffffff;
            font-size: 12px;
            font-weight: 800;
            padding: 6px 12px;
            border-radius: 6px 6px 0 0;
            display: flex;
            justify-content: space-between;
            text-transform: uppercase;
          }
          .courses-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
          }
          .courses-table th {
            background: #f1f5f9;
            border-bottom: 1px solid #cbd5e1;
            color: #475569;
            font-weight: 700;
            text-align: left;
            padding: 8px 12px;
            text-transform: uppercase;
          }
          .courses-table td {
            border-bottom: 1px solid #e2e8f0;
            padding: 8px 12px;
          }
          .code {
            font-family: monospace;
            font-weight: 700;
          }
          .title {
            font-weight: 500;
          }
          .credits, .grade, .points {
            font-weight: 700;
          }
          .summary-block {
            background: #1e3a8a;
            color: #ffffff;
            border-radius: 10px;
            padding: 15px 20px;
            display: flex;
            justify-content: space-around;
            font-size: 14px;
            font-weight: 800;
            margin-top: 30px;
            page-break-inside: avoid;
          }
          .summary-item {
            text-align: center;
          }
          .summary-lbl {
            font-size: 10px;
            opacity: 0.8;
            text-transform: uppercase;
            margin-bottom: 4px;
            display: block;
          }
          footer {
            margin-top: 50px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            font-size: 11px;
            color: #64748b;
          }
          .signature-block {
            text-align: center;
            width: 180px;
          }
          .sig-line {
            border-top: 1px solid #94a3b8;
            margin-top: 40px;
            padding-top: 5px;
            font-weight: 700;
          }
          .stamp-block {
            width: 100px;
            height: 100px;
            border: 2px dashed #94a3b8;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 800;
            font-size: 10px;
            text-transform: uppercase;
            opacity: 0.6;
          }

          @media print {
            .batch-page {
              page-break-after: always;
            }
            .batch-page:last-child {
              page-break-after: avoid;
            }
            .watermark {
              color: rgba(226, 232, 240, 0.4) !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .semester-header {
              background-color: #1e3a8a !important;
              color: #ffffff !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .summary-block {
              background-color: #1e3a8a !important;
              color: #ffffff !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }
        </style>
      </head>
      <body>
        ${mergedTranscriptsHtml}
      </body>
      </html>
    `;

    printWindow.document.write(fullHtml);
    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
    }, 800);

  } catch (err) {
    console.error('Failed to run batch transcript print:', err);
    alert('Failed to generate batch academic transcripts.');
  }
};
