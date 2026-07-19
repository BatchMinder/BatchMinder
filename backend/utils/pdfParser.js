export const extractCurriculumFromPDF = async (buffer) => {
  const { PDFParse } = await import('pdf-parse');
  const data = await PDFParse(buffer);
  const text = data.text;
  
  // Basic heuristic: split by lines, look for lines that look like courses.
  // In the HEC PDF, many courses end with credit hours like 3, 3+1, 2+1, 3(2+1), etc.
  const lines = text.split('\n');
  const courses = [];
  
  // A simplistic regex to capture a course title and its credit hours at the end of the line
  // e.g. "Programming Fundamentals 3+1", "Data Structures 4 (3+1)", "Linear Algebra 3"
  const courseRegex = /^(.+?)\s+(\d(?:\+\d|\s*\(\d\+\d\))?)$/i;

  let currentCategory = 'General';

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    // Try to guess categories based on keywords
    if (line.toLowerCase().includes('general education')) {
      currentCategory = 'General Education';
      continue;
    } else if (line.toLowerCase().includes('major courses')) {
      currentCategory = 'Major Core';
      continue;
    } else if (line.toLowerCase().includes('electives')) {
      currentCategory = 'Specialization Elective';
      continue;
    }

    const match = line.match(courseRegex);
    if (match) {
      let title = match[1].trim();
      let creditStr = match[2].trim();
      
      // Try to parse total credits
      let totalCredits = 3;
      if (creditStr.includes('+')) {
        const parts = creditStr.match(/(\d)\s*\+\s*(\d)/);
        if (parts) {
          totalCredits = parseInt(parts[1]) + parseInt(parts[2]);
        }
      } else {
        const num = parseInt(creditStr.replace(/\D/g, ''));
        if (!isNaN(num) && num > 0 && num <= 6) {
          totalCredits = num;
        }
      }

      // Cleanup title (remove numbers at start if it's a list)
      title = title.replace(/^\d+\.\s*/, '').replace(/^\*\s*/, '').trim();

      // Avoid capturing short random words or very long sentences
      if (title.length > 5 && title.length < 80) {
        // Generate a pseudo-code for the HEC course
        const codePrefix = currentCategory === 'General Education' ? 'GE' : 
                           currentCategory === 'Major Core' ? 'CS' : 'SE';
        const code = `${codePrefix}-${Math.floor(Math.random() * 899) + 100}`;

        courses.push({
          code,
          title,
          creditHours: totalCredits,
          category: currentCategory,
        });
      }
    }
  }

  // Deduplicate by title
  const uniqueCourses = [];
  const titles = new Set();
  for (const c of courses) {
    if (!titles.has(c.title.toLowerCase())) {
      titles.add(c.title.toLowerCase());
      uniqueCourses.push(c);
    }
  }

  return uniqueCourses;
};
