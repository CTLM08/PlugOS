# plugos-plugs-education

A JavaScript SDK for building education platforms with Google Classroom-like features. Includes student management, classrooms, assignments, announcements, and grading.

## Installation

```bash
npm install plugos-plugs-education
```

## Quick Start

```javascript
import { EduSDK } from 'plugos-plugs-education';

// Initialize the SDK
const edu = new EduSDK();

// Create a classroom
const classroom = await edu.classrooms.create({
  name: 'Computer Science 101',
  description: 'Introduction to Programming',
  teacherId: 'teacher-1'
});

// Create a student
const student = await edu.students.create({
  name: 'John Doe',
  email: 'john@example.com'
});

// Enroll student in classroom
await edu.classrooms.enrollStudent(classroom.id, student.id);

// Create an assignment
const assignment = await edu.assignments.create({
  classroomId: classroom.id,
  title: 'Hello World Program',
  description: 'Write your first program',
  dueDate: new Date('2026-02-01'),
  points: 100
});

// Student submits assignment
await edu.assignments.submit(assignment.id, student.id, {
  content: 'console.log("Hello World");'
});

// Grade the submission
await edu.assignments.grade(assignment.id, student.id, 95, 'Great job!');
```

## PlugOS Integration

This package includes everything needed to integrate with PlugOS as a plug.

### 1. Register the Plug in Database

```sql
-- Run this SQL to add the Education plug
INSERT INTO plugs (name, slug, description, icon, is_active)
VALUES (
  'Education Manager',
  'education-manager',
  'Manage classrooms, students, assignments, and announcements',
  'mdi:school',
  true
);
```

Or use the helper:

```javascript
import { insertPlugSQL } from 'plugos-plugs-education/integration/database';
// Execute insertPlugSQL in your database
```

### 2. Add Server Routes

```javascript
// In your server/src/index.js
import { createEducationRoutes } from 'plugos-plugs-education/integration/routes';
import { authenticate, requireOrg, requireRole } from './middleware/auth.js';

const educationRoutes = createEducationRoutes({ authenticate, requireOrg, requireRole });
app.use('/api/education', educationRoutes);
```

### 3. Add Route Mapping

Add to your route mappings in Dashboard.jsx and Layout.jsx:

```javascript
const routes = {
  // ... existing routes
  'education-manager': '/education'
};
```

### 4. Copy React Component

Copy the component from `node_modules/plugos-plugs-education/integration/EducationManager.jsx` to your `client/src/plugs/EducationManager/index.jsx`, or use the full component already in your PlugOS installation.

### 5. Add Route in App.jsx

```javascript
import EducationManager from './plugs/EducationManager';

// In your routes
<Route path="/education" element={<EducationManager />} />
```
```

## Features

### 📚 Students
- Create, update, delete students
- Search by name or email
- Track classroom enrollments

### 🏫 Classrooms
- Create and manage classrooms
- Enroll/remove students
- Generate and use join codes
- Get class roster

### 📝 Assignments
- Create assignments with due dates and points
- Submit and resubmit work
- Grade submissions with feedback
- Calculate student grades

### 📢 Announcements
- Post classroom announcements
- Add comments to announcements
- Sort by latest

## Events

Subscribe to SDK events for real-time updates:

```javascript
edu.on('student:enrolled', ({ studentId, classroomId }) => {
  console.log(`Student ${studentId} joined classroom ${classroomId}`);
});

edu.on('assignment:graded', ({ studentId, grade }) => {
  console.log(`Student ${studentId} received grade: ${grade}`);
});
```

### Available Events
| Event | Description |
|-------|-------------|
| `student:created` | A new student was created |
| `student:updated` | A student was updated |
| `student:deleted` | A student was deleted |
| `student:enrolled` | A student joined a classroom |
| `student:unenrolled` | A student left a classroom |
| `classroom:created` | A new classroom was created |
| `classroom:updated` | A classroom was updated |
| `classroom:deleted` | A classroom was deleted |
| `assignment:created` | A new assignment was created |
| `assignment:submitted` | A student submitted an assignment |
| `assignment:graded` | An assignment was graded |
| `announcement:created` | An announcement was posted |
| `announcement:commented` | A comment was added |

## Storage Adapters

By default, data is stored in memory. For persistence, use a different adapter:

### LocalStorage (Browser)
```javascript
import { EduSDK, LocalStorageAdapter } from 'plugos-plugs-education';

const edu = new EduSDK({
  adapter: new LocalStorageAdapter('my_app_')
});
```

### Custom Adapter
Implement your own storage adapter by extending `StorageAdapter`:

```javascript
import { StorageAdapter } from 'plugos-plugs-education';

class MyDatabaseAdapter extends StorageAdapter {
  async get(collection, id) { /* ... */ }
  async set(collection, id, data) { /* ... */ }
  async delete(collection, id) { /* ... */ }
  async list(collection, filters) { /* ... */ }
  async query(collection, predicate) { /* ... */ }
  async clear(collection) { /* ... */ }
  async clearAll() { /* ... */ }
}
```

## API Reference

### Students

| Method | Description |
|--------|-------------|
| `create(data)` | Create a student |
| `get(id)` | Get student by ID |
| `getByEmail(email)` | Get student by email |
| `update(id, updates)` | Update student |
| `delete(id)` | Delete student |
| `list(filters)` | List all students |
| `search(query)` | Search by name/email |

### Classrooms

| Method | Description |
|--------|-------------|
| `create(data)` | Create a classroom |
| `get(id)` | Get classroom by ID |
| `update(id, updates)` | Update classroom |
| `delete(id)` | Delete classroom |
| `enrollStudent(classroomId, studentId)` | Enroll a student |
| `removeStudent(classroomId, studentId)` | Remove a student |
| `getRoster(classroomId)` | Get all students |
| `joinWithCode(code, studentId)` | Join via code |
| `regenerateJoinCode(classroomId)` | Get new join code |

### Assignments

| Method | Description |
|--------|-------------|
| `create(data)` | Create assignment |
| `get(id)` | Get assignment |
| `getByClassroom(classroomId)` | Get class assignments |
| `submit(assignmentId, studentId, data)` | Submit work |
| `grade(assignmentId, studentId, grade, feedback)` | Grade submission |
| `getSubmissions(assignmentId)` | Get all submissions |
| `getStudentGrades(studentId, classroomId)` | Get grades summary |

### Announcements

| Method | Description |
|--------|-------------|
| `create(data)` | Create announcement |
| `get(id)` | Get announcement |
| `getByClassroom(classroomId)` | Get class announcements |
| `addComment(id, comment)` | Add a comment |
| `deleteComment(id, commentId)` | Delete a comment |

## License

MIT
