# PlugOS API Documentation

> **Last Updated:** 2026-01-18

This document contains all API endpoints for the PlugOS platform. Updated progressively as new features are added.

---

## Table of Contents
- [Authentication](#authentication)
- [Organizations](#organizations)
- [Plugs](#plugs)
- [Employees](#employees)
- [Departments](#departments)
- [Attendance](#attendance)
- [Documents](#documents)
- [Invites](#invites)

---

## Authentication

Base path: `/api/auth`

| Method | Endpoint | Description | Auth Required | Role |
|--------|----------|-------------|---------------|------|
| POST | `/register` | Create new user + organization (admin registration) | No | - |
| POST | `/login` | User login | No | - |
| GET | `/me` | Get current user info | Yes | Any |
| POST | `/join` | *(Deprecated)* Employee registration via invite | No | - |

### POST /register
Create a new organization with the registering user as admin.

**Request Body:**
```json
{
  "email": "admin@company.com",
  "password": "securepassword",
  "name": "John Doe",
  "orgName": "Acme Inc"
}
```

**Response:** `201 Created`
```json
{
  "user": { "id": "uuid", "email": "admin@company.com", "name": "John Doe" },
  "organization": { "id": "uuid", "name": "Acme Inc", "slug": "acme-inc" },
  "token": "jwt_token"
}
```

---

### POST /login
Authenticate user and get JWT token.

**Request Body:**
```json
{
  "email": "user@company.com",
  "password": "password"
}
```

**Response:** `200 OK`
```json
{
  "user": { "id": "uuid", "email": "user@company.com", "name": "User Name" },
  "organizations": [{ "id": "uuid", "name": "Acme Inc", "slug": "acme-inc", "role": "admin" }],
  "token": "jwt_token"
}
```

---

### GET /me
Get current authenticated user info.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "user": { "id": "uuid", "email": "user@company.com", "name": "User Name" },
  "organizations": [{ "id": "uuid", "name": "Acme Inc", "slug": "acme-inc", "role": "admin" }]
}
```

---

### POST /join
*(Deprecated)* Employee registration via invite. 

> [!WARNING]
> This endpoint is deprecated. Use `POST /employees/org/:orgId` with `createAccount: true` instead to create employee accounts directly.

---

## Organizations

Base path: `/api/organizations`

| Method | Endpoint | Description | Auth Required | Role |
|--------|----------|-------------|---------------|------|
| GET | `/:orgId` | Get organization details | Yes | Member |
| PUT | `/:orgId` | Update organization | Yes | Admin |
| GET | `/:orgId/members` | List organization members | Yes | Member |
| POST | `/:orgId/members` | Add member to organization | Yes | Admin |
| DELETE | `/:orgId/members/:userId` | Remove member | Yes | Admin |

---

## Plugs

Base path: `/api/plugs`

| Method | Endpoint | Description | Auth Required | Role |
|--------|----------|-------------|---------------|------|
| GET | `/` | Get all available plugs | Yes | Any |
| GET | `/org/:orgId` | Get enabled plugs for org (filtered by department) | Yes | Member |
| POST | `/org/:orgId/enable/:plugId` | Enable plug for org | Yes | Admin |
| DELETE | `/org/:orgId/disable/:plugId` | Disable plug for org | Yes | Admin |
| GET | `/org/:orgId/check/:plugSlug` | Check if plug is enabled | Yes | Member |

### GET /org/:orgId
Get plugs enabled for organization. Non-admin users only see plugs assigned to their department.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "name": "Employee Directory",
    "slug": "employee-directory",
    "description": "Manage employee information",
    "icon": "users",
    "settings": {},
    "enabled_at": "2026-01-14T00:00:00Z"
  }
]
```

---

## Employees

Base path: `/api/employees`

| Method | Endpoint | Description | Auth Required | Role |
|--------|----------|-------------|---------------|------|
| GET | `/org/:orgId` | List employees | Yes | Member |
| GET | `/org/:orgId/:employeeId` | Get single employee | Yes | Member |
| POST | `/org/:orgId` | Create employee (optionally with user account) | Yes | Admin/Manager |
| PUT | `/org/:orgId/:employeeId` | Update employee | Yes | Admin/Manager |
| DELETE | `/org/:orgId/:employeeId` | Delete employee | Yes | Admin/Manager |
| GET | `/org/:orgId/departments` | Get department list | Yes | Member |

### POST /org/:orgId
Create an employee. Optionally create a user account with generated password.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@company.com",
  "phone": "+1234567890",
  "department": "Engineering",
  "position": "Software Engineer",
  "createAccount": true,
  "role": "employee",
  "department_id": "uuid"
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "name": "John Doe",
  "email": "john@company.com",
  "department": "Engineering",
  "position": "Software Engineer",
  "account_created": true,
  "generated_password": "abc123xyz",
  "user_id": "uuid"
}
```

> [!IMPORTANT]
> The `generated_password` is only returned once. Admin must save and share it with the employee.

---

## Departments

Base path: `/api/departments`

*(Implemented)*

| Method | Endpoint | Description | Auth Required | Role |
|--------|----------|-------------|---------------|------|
| GET | `/org/:orgId` | List all departments | Yes | Member |
| POST | `/org/:orgId` | Create department | Yes | Admin |
| PUT | `/org/:orgId/:deptId` | Update department | Yes | Admin |
| DELETE | `/org/:orgId/:deptId` | Delete department | Yes | Admin |
| GET | `/org/:orgId/:deptId/plugs` | Get plugs for department | Yes | Member |
| POST | `/org/:orgId/:deptId/plugs/:plugId` | Assign plug to department | Yes | Admin |
| DELETE | `/org/:orgId/:deptId/plugs/:plugId` | Remove plug from department | Yes | Admin |

### GET /org/:orgId
List all departments in organization.

**Response:** `200 OK`
```json
[
  { "id": "uuid", "name": "Engineering", "created_at": "2026-01-14T00:00:00Z" },
  { "id": "uuid", "name": "Human Resources", "created_at": "2026-01-14T00:00:00Z" }
]
```

### POST /org/:orgId
Create a new department.

**Request Body:**
```json
{
  "name": "Engineering"
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "name": "Engineering",
  "org_id": "uuid",
  "created_at": "2026-01-14T00:00:00Z"
}
```

---

## Attendance

Base path: `/api/attendance`

| Method | Endpoint | Description | Auth Required | Role |
|--------|----------|-------------|---------------|------|
| GET | `/org/:orgId/status` | Get current clock status | Yes | Any |
| POST | `/org/:orgId/clock-in` | Clock in | Yes | Any |
| POST | `/org/:orgId/clock-out` | Clock out | Yes | Any |
| GET | `/org/:orgId/my-attendance` | Get own attendance records | Yes | Any |
| GET | `/org/:orgId/team` | Get team attendance for date | Yes | Admin/Manager |
| POST | `/org/:orgId/leave` | Submit leave request | Yes | Any |
| GET | `/org/:orgId/leave` | Get own leave requests | Yes | Any |
| GET | `/org/:orgId/leave/pending` | Get pending leave requests | Yes | Admin/Manager |
| PUT | `/org/:orgId/leave/:id/review` | Approve/reject leave | Yes | Admin/Manager |
| GET | `/org/:orgId/leave/all` | Get all leave requests | Yes | Admin/Manager |

### POST /org/:orgId/leave
Submit a leave request.

**Request Body:**
```json
{
  "leave_type": "annual",
  "start_date": "2026-01-20",
  "end_date": "2026-01-22",
  "reason": "Family vacation"
}
```

**Response:** `201 Created`

### PUT /org/:orgId/leave/:id/review
Approve or reject a leave request.

**Request Body:**
```json
{
  "status": "approved"
}
```

---

## Documents

Base path: `/api/documents`

| Method | Endpoint | Description | Auth Required | Role |
|--------|----------|-------------|---------------|------|
| GET | `/org/:orgId` | List documents for org (with optional folder filter) | Yes | Member |
| POST | `/org/:orgId` | Upload document | Yes | Any |
| GET | `/:docId/download` | Download document | Yes | Member |
| DELETE | `/:docId` | Delete document | Yes | Owner/Admin |
| GET | `/org/:orgId/folders` | List folders | Yes | Member |
| POST | `/org/:orgId/folders` | Create folder | Yes | Admin/Manager |
| DELETE | `/folders/:folderId` | Delete folder | Yes | Admin |
| GET | `/folders/:folderId/permissions` | Get folder permissions | Yes | Admin |
| POST | `/folders/:folderId/permissions` | Add folder permission | Yes | Admin |
| DELETE | `/folders/:folderId/permissions/:permId` | Remove folder permission | Yes | Admin |

### POST /org/:orgId
Upload a document to an organization.

**Request Body:**
```json
{
  "name": "report.pdf",
  "fileType": "application/pdf",
  "fileSize": 102400,
  "content": "base64_encoded_content",
  "folderId": "uuid" // optional
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "name": "report.pdf",
  "file_type": "application/pdf",
  "file_size": 102400,
  "folder_id": "uuid",
  "uploaded_by": "uuid",
  "created_at": "2026-01-18T00:00:00Z"
}
```

### POST /org/:orgId/folders
Create a new folder.

**Request Body:**
```json
{
  "name": "Engineering Docs",
  "parentId": "uuid" // optional, for nested folders
}
```

### POST /folders/:folderId/permissions
Add access permission to a folder. When permissions are set, only specified departments/users can access the folder.

**Request Body:**
```json
{
  "departmentId": "uuid"
}
```

or

```json
{
  "userId": "uuid"
}
```

> [!NOTE]
> If a folder has no permissions set, all organization members can access it.
> Once any permission is added, access becomes restricted to those with explicit permissions.

## Invites

Base path: `/api/invites`

> [!WARNING]
> **Deprecated**: The invite system has been replaced by direct account creation. 
> Use `POST /employees/org/:orgId` with `createAccount: true` to create employee accounts directly.
> Admins receive a generated password to share with employees.

---

## Error Responses

All endpoints return errors in this format:

```json
{
  "error": "Error message description"
}
```

**Common HTTP Status Codes:**
| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Missing/invalid token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 500 | Internal Server Error |

---

## Authentication

All protected endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

Tokens are obtained from `/auth/login` or `/auth/register` endpoints.
