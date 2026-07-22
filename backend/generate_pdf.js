import PDFDocument from 'pdfkit';
import fs from 'fs';

const doc = new PDFDocument({ margin: 50 });
const outputPath = '../mock_transcript.pdf';
doc.pipe(fs.createWriteStream(outputPath));

doc.fontSize(16).text('National University of Sciences & Technology (NUST)', { align: 'center' });
doc.moveDown();
doc.fontSize(12).text('Student Name: John Doe');
doc.text('Program: Bachelor of Science in Computer Science (BSCS)');
doc.moveDown(2);

const courses = [
  { sem: 1, list: [
    'CS-101 Programming Fundamentals 4 A',
    'MT-101 Calculus & Analytical Geometry 3 B+',
    'PH-101 Applied Physics 3 B',
    'HU-101 English Composition & Comprehension 2 A-',
    'IS-101 Islamic Studies / Ethics 2 B+'
  ]},
  { sem: 2, list: [
    'CS-102 Object Oriented Programming 4 A',
    'CS-103 Digital Logic Design 4 B+',
    'MT-102 Linear Algebra 3 B+',
    'MT-103 Discrete Structures 3 A-',
    'HU-102 Pakistan Studies 2 A'
  ]},
  { sem: 3, list: [
    'CS-104 Data Structures & Algorithms 4 A',
    'CS-105 Computer Organization & Architecture 3 B+',
    'MT-201 Probability & Statistics 3 A-',
    'EE-201 Signals & Systems 3 B+',
    'HU-201 Technical & Business Writing 2 A'
  ]}
];

courses.forEach(semGroup => {
  doc.fontSize(14).text(`Semester ${semGroup.sem}`, { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(10);
  semGroup.list.forEach(courseStr => {
    // Format to match the regex: CODE TITLE CREDITS GRADE
    doc.text(courseStr);
  });
  doc.moveDown(1.5);
});

doc.moveDown(3);
doc.fontSize(10).fillColor('gray').text('*** OFFICIAL TRANSCRIPT ***', { align: 'center' });

doc.end();

console.log(`Successfully generated mock transcript at: ${outputPath}`);
