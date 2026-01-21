# 🔌 PlugOS

> A modular, plug-and-play organization management platform

PlugOS is a flexible enterprise platform built with React and Node.js where features ("plugs") can be enabled or disabled per organization. It provides a solid foundation for HR, attendance, payroll, and document management—all configurable based on your organization's needs.

---

## ✨ Features

### 🏢 Core Platform
| Feature | Description |
|---------|-------------|
| **Multi-tenant Architecture** | Supports multiple organizations in a single instance |
| **Role-based Access Control** | Admin, Manager, and Employee roles with granular permissions |
| **Department Management** | Organize employees and control plug access by department |
| **Secure Authentication** | JWT tokens with bcrypt password hashing |

### 🧩 Built-in Plugs

| Plug | Icon | Description |
|------|------|-------------|
| **Employee Directory** | 👥 | Manage employees, departments, and organizational structure |
| **Attendance Tracker** | 📅 | Clock in/out, attendance history, and leave request management |
| **Payroll Manager** | 💰 | Configure salaries, manage payroll periods, generate payslips |
| **Document Manager** | 📁 | Upload, organize, and share files with folder-level permissions |
| **Education Manager** | 🎓 | Classrooms, students, assignments, and announcements |

> Each plug can be independently enabled/disabled per organization through the admin dashboard.

---

## 🛠️ Tech Stack

### Frontend
- ⚛️ **React 18** with Vite for blazing-fast development
- 🧭 **React Router** for client-side navigation
- 🎨 **TailwindCSS** for utility-first styling
- 🖼️ **Iconify** for beautiful, consistent icons
- 🌐 **Axios** for API communication

### Backend
- 🚀 **Express.js** REST API
- 🐘 **PostgreSQL** database
- 🔐 **JWT** authentication
- 🔒 **bcrypt** password hashing

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- [PostgreSQL](https://www.postgresql.org/) database

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/PlugOS.git
   cd PlugOS
   ```

2. **Set up the backend**
   ```bash
   cd server
   npm install
   ```

3. **Configure environment variables**
   
   Create a `.env` file in the `server` directory:
   ```env
   PORT=5000
   DATABASE_URL=postgresql://username:password@localhost:5432/plugos
   JWT_SECRET=your-super-secret-key-here
   ```

4. **Create the database & run migrations**
   ```bash
   # Create the database in PostgreSQL first
   # Then run migrations:
   npm run db:migrate
   ```

5. **Set up the frontend**
   ```bash
   cd ../client
   npm install
   ```

### Running the Application

**Start both servers** (in separate terminals):

```bash
# Terminal 1 - Backend (from /server)
npm run dev

# Terminal 2 - Frontend (from /client)
npm run dev
```

🌐 Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 📁 Project Structure

```
PlugOS/
├── 📂 client/                  # React frontend
│   ├── 📂 src/
│   │   ├── 📂 components/      # Reusable UI components
│   │   │   ├── Layout.jsx      # Main app layout with sidebar
│   │   │   ├── ConfirmModal.jsx
│   │   │   └── ...
│   │   ├── 📂 context/         # React context providers
│   │   │   └── AuthContext.jsx # Authentication state
│   │   ├── 📂 pages/           # Route page components
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Login.jsx
│   │   │   └── ...
│   │   ├── 📂 plugs/           # Plug-specific components
│   │   │   ├── EmployeeDirectory/
│   │   │   ├── AttendanceTracker/
│   │   │   ├── PayrollManager/
│   │   │   └── DocumentManager/
│   │   └── 📂 utils/           # Utility functions
│   └── package.json
│
├── 📂 server/                  # Express backend
│   ├── 📂 src/
│   │   ├── 📂 config/          # Database & migration config
│   │   │   ├── db.js           # PostgreSQL connection pool
│   │   │   └── migrate.js      # Database migrations
│   │   ├── 📂 middleware/      # Express middleware
│   │   │   └── auth.js         # JWT & role-based auth
│   │   ├── 📂 routes/          # API route handlers
│   │   │   ├── auth.js         # Login, register, password
│   │   │   ├── employees.js    # Employee CRUD
│   │   │   ├── attendance.js   # Clock in/out, leaves
│   │   │   ├── payroll.js      # Salaries, payslips
│   │   │   ├── documents.js    # File management
│   │   │   └── plugs.js        # Plug enable/disable
│   │   └── 📂 schema/          # SQL schema files
│   └── package.json
│
├── API_DOCS.md                 # Complete API documentation
└── README.md                   # You are here!
```

---

## 🔑 Default Roles & Permissions

| Role | Dashboard | View Employees | Manage Employees | Approve Leaves | Manage Payroll |
|------|-----------|----------------|------------------|----------------|----------------|
| **Admin** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Manager** | ✅ | ✅ | ❌ | ✅ | ❌ |
| **Employee** | ✅ | ✅ (limited) | ❌ | ❌ | ❌ |

---

## 📖 Documentation

Comprehensive documentation is available in the [`docs/`](./docs/) folder:

| Guide | Description |
|-------|-------------|
| [Getting Started](./docs/getting-started.md) | Installation and setup |
| [Architecture](./docs/architecture.md) | System design overview |
| [Plugin Development](./docs/plugin-development.md) | Create your own plugs |
| [API Reference](./docs/api-reference.md) | REST API endpoints |
| [Contributing](./docs/contributing.md) | How to contribute |

For legacy API documentation, see [API_DOCS.md](./API_DOCS.md).

---

## 🔒 Security Features

- 🔐 **Password Hashing** - bcrypt with salt rounds
- 🎫 **JWT Tokens** - Secure session management
- 👮 **Role-based Access** - Admin/Manager/Employee permissions
- 🏢 **Organization Isolation** - Complete data separation between tenants
- 📁 **Department-level Control** - Restrict plug access by department

---

## 🧩 SDK Plugs

PlugOS includes standalone SDK packages that provide complete functionality out of the box:

### 🎓 Education Manager

A Google Classroom-like education system with student management, classrooms, assignments, and announcements.

📖 **[View Education SDK Documentation](./plugs/education/README.md)**

**Features:**
- 👨‍🎓 Student management with enrollment tracking
- 🏫 Classrooms with join codes
- 📝 Assignments with grading and submissions
- 📢 Announcements with comments
- 🔌 Ready-to-use API routes and React components

```bash
# Navigate to the plug
cd plugs/education

# Run the example
npm run example
```

> More SDK plugs coming soon! Check the `plugs/` directory for available packages.

---

## 🤝 Contributing

We welcome contributions! The main ways to contribute are:

### 🧩 Creating New Plugs
The best way to contribute is by creating new plugs that extend PlugOS functionality. Ideas include:
- 📊 **Analytics Dashboard** - Organization insights and reports
- 💬 **Team Chat** - Internal messaging system
- 📋 **Task Manager** - Project and task tracking
- 🎓 **Training Portal** - Employee onboarding and courses
- 📝 **Performance Reviews** - Employee evaluation system

### 🔧 Core Improvements
- Bug fixes and performance optimizations
- UI/UX enhancements
- Documentation improvements
- Security patches

### How to Contribute

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-plug`)
3. Develop your plug or improvement
4. Test thoroughly with the existing system
5. Commit your changes (`git commit -m 'Add amazing plug'`)
6. Push to the branch (`git push origin feature/amazing-plug`)
7. Open a Pull Request with a clear description

> 💡 **Tip**: Check the Plugin SDK documentation (coming soon) for guidelines on creating plugs that integrate seamlessly with PlugOS.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE) - see the LICENSE file for details.

---

<p align="center">
  Made with ❤️ for modern organizations
</p>
