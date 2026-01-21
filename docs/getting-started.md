# 🚀 Getting Started

This guide will help you set up PlugOS on your local machine.

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- [PostgreSQL](https://www.postgresql.org/) 14 or later
- Git

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/PlugOS.git
cd PlugOS
```

### 2. Backend Setup

```bash
cd server
npm install
```

Create a `.env` file in the `server` directory:

```env
PORT=5000
DATABASE_URL=postgresql://username:password@localhost:5432/plugos
JWT_SECRET=your-super-secret-key-here
```

### 3. Database Setup

Create the database in PostgreSQL:

```sql
CREATE DATABASE plugos;
```

Run migrations:

```bash
npm run db:migrate
```

### 4. Frontend Setup

```bash
cd ../client
npm install
```

## Running the Application

Open two terminal windows:

**Terminal 1 - Backend:**
```bash
cd server
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd client
npm run dev
```

🌐 Open [http://localhost:5173](http://localhost:5173) in your browser.

## First Steps

1. **Register** a new account - this creates your organization
2. **Enable plugs** from the Plug Manager
3. **Invite team members** to your organization
4. **Explore** the dashboard and enabled plugs

## Next Steps

- [Architecture Overview](./architecture.md) - Understand how PlugOS works
- [Plugin Development](./plugin-development.md) - Create your own plugs
- [API Reference](./api-reference.md) - Explore the REST API
