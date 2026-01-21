# 📡 API Reference

Complete REST API documentation for PlugOS.

> **Base URL**: `http://localhost:5000/api`

## Authentication

All protected endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

---

## Auth Endpoints

### Register User & Organization

```http
POST /auth/register
```

**Body:**
```json
{
  "email": "admin@company.com",
  "password": "securepassword",
  "name": "John Doe",
  "organizationName": "My Company"
}
```

**Response:** `201 Created`
```json
{
  "user": { "id": "uuid", "email": "...", "name": "..." },
  "organization": { "id": "uuid", "name": "...", "slug": "..." },
  "token": "jwt-token"
}
```

---

### Login

```http
POST /auth/login
```

**Body:**
```json
{
  "email": "admin@company.com",
  "password": "securepassword"
}
```

**Response:** `200 OK`
```json
{
  "user": { ... },
  "organizations": [...],
  "token": "jwt-token"
}
```

---

## Organization Endpoints

### Get User's Organizations

```http
GET /organizations
```

**Response:** `200 OK`
```json
[
  { "id": "uuid", "name": "My Company", "slug": "my-company", "role": "admin" }
]
```

---

## Plug Endpoints

### Get Available Plugs

```http
GET /plugs
```

**Response:** `200 OK`
```json
[
  { "id": "uuid", "name": "Employee Directory", "slug": "employee-directory", "icon": "mdi:account-group" }
]
```

---

### Get Enabled Plugs for Organization

```http
GET /plugs/org/:orgId
```

**Response:** `200 OK`
```json
[
  { "id": "uuid", "name": "Employee Directory", "slug": "employee-directory", "settings": {} }
]
```

---

### Enable Plug (Admin)

```http
POST /plugs/org/:orgId/enable/:plugId
```

**Body:** (optional)
```json
{
  "settings": { "customOption": true }
}
```

**Response:** `201 Created`

---

### Disable Plug (Admin)

```http
DELETE /plugs/org/:orgId/disable/:plugId
```

**Response:** `200 OK`

---

## Employee Endpoints

### List Employees

```http
GET /employees/:orgId
```

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "name": "Jane Doe",
    "email": "jane@company.com",
    "department": "Engineering",
    "position": "Developer"
  }
]
```

---

### Create Employee

```http
POST /employees/:orgId
```

**Body:**
```json
{
  "name": "Jane Doe",
  "email": "jane@company.com",
  "department": "Engineering",
  "position": "Developer"
}
```

**Response:** `201 Created`

---

## Attendance Endpoints

### Clock In

```http
POST /attendance/clock-in
```

**Headers:**
```
x-org-id: <organization-id>
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "clock_in": "2026-01-20T09:00:00Z"
}
```

---

### Clock Out

```http
POST /attendance/clock-out
```

**Headers:**
```
x-org-id: <organization-id>
```

**Response:** `200 OK`

---

### Get Attendance Records

```http
GET /attendance/org/:orgId?startDate=2026-01-01&endDate=2026-01-31
```

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "user_id": "uuid",
    "user_name": "John Doe",
    "clock_in": "2026-01-20T09:00:00Z",
    "clock_out": "2026-01-20T18:00:00Z"
  }
]
```

---

## Error Responses

All endpoints return consistent error responses:

```json
{
  "error": "Error message description"
}
```

**Common Status Codes:**
| Code | Meaning |
|------|---------|
| `400` | Bad Request - Invalid input |
| `401` | Unauthorized - Invalid/missing token |
| `403` | Forbidden - Insufficient permissions |
| `404` | Not Found - Resource doesn't exist |
| `500` | Server Error - Something went wrong |

---

## Rate Limiting

Currently no rate limiting is implemented. For production, consider adding rate limiting middleware.

---

## Full Documentation

For complete API details including Payroll and Document endpoints, see [API_DOCS.md](../API_DOCS.md) in the project root.
