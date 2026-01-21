/**
 * edu-classroom-sdk - Basic Usage Example
 * 
 * Run this example with:
 * node examples/basic-usage.js
 */

import { EduSDK } from '../src/index.js';

async function main() {
  console.log('🎓 edu-classroom-sdk Example\n');
  console.log('='.repeat(50));

  // Initialize SDK
  const edu = new EduSDK();

  // Set up event listeners
  edu.on('student:created', (student) => {
    console.log(`📧 Event: Student created - ${student.name}`);
  });

  edu.on('student:enrolled', ({ studentId, classroomId }) => {
    console.log(`📧 Event: Student ${studentId} enrolled in ${classroomId}`);
  });

  edu.on('assignment:graded', ({ studentId, grade }) => {
    console.log(`📧 Event: Student ${studentId} received grade: ${grade}`);
  });

  console.log('\n1️⃣  Creating a classroom...\n');
  
  // Create a classroom
  const classroom = await edu.classrooms.create({
    name: 'Introduction to JavaScript',
    description: 'Learn the basics of JavaScript programming',
    teacherId: 'teacher-001',
    subject: 'Computer Science'
  });
  
  console.log('Classroom created:', {
    id: classroom.id,
    name: classroom.name,
    joinCode: classroom.joinCode
  });

  console.log('\n2️⃣  Creating students...\n');

  // Create students
  const student1 = await edu.students.create({
    name: 'Alice Johnson',
    email: 'alice@example.com',
    profile: { grade: '10th' }
  });

  const student2 = await edu.students.create({
    name: 'Bob Smith',
    email: 'bob@example.com',
    profile: { grade: '10th' }
  });

  console.log('Students created:', [student1.name, student2.name]);

  console.log('\n3️⃣  Enrolling students...\n');

  // Enroll students
  await edu.classrooms.enrollStudent(classroom.id, student1.id);
  await edu.classrooms.enrollStudent(classroom.id, student2.id);

  // Get roster
  const roster = await edu.classrooms.getRoster(classroom.id);
  console.log('Class roster:', roster.map(s => s.name));

  console.log('\n4️⃣  Creating an assignment...\n');

  // Create assignment
  const assignment = await edu.assignments.create({
    classroomId: classroom.id,
    title: 'Variables and Data Types',
    description: 'Write a program that demonstrates different variable types',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Due in 1 week
    points: 100
  });

  console.log('Assignment created:', {
    id: assignment.id,
    title: assignment.title,
    points: assignment.points
  });

  console.log('\n5️⃣  Students submitting work...\n');

  // Students submit
  await edu.assignments.submit(assignment.id, student1.id, {
    content: 'let name = "Alice";\nlet age = 16;\nlet isStudent = true;'
  });
  console.log('Alice submitted her assignment');

  await edu.assignments.submit(assignment.id, student2.id, {
    content: 'var x = 10;'
  });
  console.log('Bob submitted his assignment');

  console.log('\n6️⃣  Grading submissions...\n');

  // Grade submissions
  await edu.assignments.grade(assignment.id, student1.id, 95, 'Excellent work! Great use of different data types.');
  await edu.assignments.grade(assignment.id, student2.id, 75, 'Good start, but try using let/const instead of var.');

  console.log('\n7️⃣  Viewing grades...\n');

  // Get grade summary
  const aliceGrades = await edu.assignments.getStudentGrades(student1.id, classroom.id);
  console.log('Alice\'s grades:', {
    percentage: aliceGrades.summary.percentage + '%',
    earnedPoints: aliceGrades.summary.earnedPoints,
    totalPoints: aliceGrades.summary.totalPoints
  });

  const bobGrades = await edu.assignments.getStudentGrades(student2.id, classroom.id);
  console.log('Bob\'s grades:', {
    percentage: bobGrades.summary.percentage + '%',
    earnedPoints: bobGrades.summary.earnedPoints,
    totalPoints: bobGrades.summary.totalPoints
  });

  console.log('\n8️⃣  Posting an announcement...\n');

  // Create announcement
  const announcement = await edu.announcements.create({
    classroomId: classroom.id,
    title: 'Welcome to the class!',
    content: 'Hello everyone! Looking forward to a great semester.',
    authorId: 'teacher-001'
  });

  console.log('Announcement posted:', announcement.title);

  // Add a comment
  await edu.announcements.addComment(announcement.id, {
    authorId: student1.id,
    content: 'Thank you! Excited to learn!'
  });
  console.log('Alice commented on the announcement');

  console.log('\n9️⃣  Joining with code...\n');

  // Create another student who joins with code
  const student3 = await edu.students.create({
    name: 'Charlie Brown',
    email: 'charlie@example.com'
  });

  await edu.classrooms.joinWithCode(classroom.joinCode, student3.id);
  console.log(`Charlie joined using code: ${classroom.joinCode}`);

  // Final roster
  const finalRoster = await edu.classrooms.getRoster(classroom.id);
  console.log('\nFinal roster:', finalRoster.map(s => s.name));

  console.log('\n' + '='.repeat(50));
  console.log('✅ Example completed successfully!');
}

main().catch(console.error);
