# PlugOS

A modular, plug-and-play organization management platform built with React and Node.js. PlugOS provides a flexible architecture where features ("plugs") can be enabled or disabled per organization.

## Features

### Core Platform
- **Multi-tenant Architecture** - Support for multiple organizations
- **Role-based Access Control** - Admin and employee roles with granular permissions
- **Department Management** - Organize employees into departments with plug-level access control
- **Secure Authentication** - JWT-based auth with bcrypt password hashing

### Available Plugs

| Plug | Description |
|------|-------------|
| **Employee Directory** | Manage employees, departments, and organizational structure |
| **Attendance Tracker** | Track attendance, clock in/out, and manage leave requests |
| **Payroll Manager** | Configure salaries, manage payroll periods, and generate payslips |

## Tech Stack

### Frontend
- **React 18** with Vite
- **React Router** for navigation
- **TailwindCSS** for styling
- **Iconify** for icons
- **Axios** for API calls

### Backend
- **Express.js** REST API
- **PostgreSQL** database
- **JWT** authentication
- **bcrypt** password hashing

## Getting Started

### Prerequisites
- Node.js (v18+)
- PostgreSQL database

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/PlugOS.git
   cd PlugOS
   ```

2. **Set up the server**
   ```bash
   cd server
   npm install
   ```

3. **Configure environment variables**
   
   Create a `.env` file in the `server` directory:
   ```env
   PORT=5000
   DATABASE_URL=postgresql://username:password@localhost:5432/plugos
   JWT_SECRET=your-secret-key
   ```

4. **Run database migrations**
   ```bash
   npm run db:migrate
   ```

5. **Set up the client**
   ```bash
   cd ../client
   npm install
   ```

### Running the Application

1. **Start the server** (from `/server` directory)
   ```bash
   npm run dev
   ```

2. **Start the client** (from `/client` directory)
   ```bash
   npm run dev
   ```

3. Open `http://localhost:5173` in your browser

## Project Structure

```
PlugOS/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── context/        # React context providers
│   │   ├── pages/          # Page components
│   │   ├── plugs/          # Plug-specific components
│   │   │   ├── EmployeeDirectory/
│   │   │   ├── AttendanceTracker/
│   │   │   └── PayrollManager/
│   │   └── utils/          # Utility functions
│   └── package.json
├── server/                 # Express backend
│   ├── src/
│   │   ├── config/         # Database configuration
│   │   ├── middleware/     # Express middleware
│   │   └── routes/         # API route handlers
│   └── package.json
└── API_DOCS.md            # API documentation
```

## API Documentation

See [API_DOCS.md](./API_DOCS.md) for detailed API documentation.

## Security

- Passwords are hashed using bcrypt
- JWT tokens for session management
- Role-based access control
- Department-level plug access restrictions

## License

This project is private and proprietary.
