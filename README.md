# Auth System Backend

A Node.js + Express + MongoDB authentication system with User and Admin roles, featuring an approval workflow for new users.

## Features
- MVC Architecture
- User Signup (Pending status by default)
- Admin Login (Hardcoded/Env credentials)
- Admin Panel APIs (View pending users, Approve users)
- JWT Authentication with HTTP-only Cookies
- Role-based Access Control (RBAC)
- Password hashing with Bcrypt

## Tech Stack
- **Node.js** & **Express**
- **MongoDB** with **Mongoose**
- **JWT** (JSON Web Tokens)
- **Cookie-parser**
- **Bcryptjs**

## Project Setup

1. **Clone the repository** (or navigate to the project folder)
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Configure Environment Variables**:
   Create a `.env` file in the root directory (one has been created for you).
   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/auth_system
   JWT_SECRET=your_super_secret_jwt_key
   ADMIN_EMAIL=admin@example.com
   ADMIN_PASSWORD=admin123
   NODE_ENV=development
   ```
4. **Run the server**:
   ```bash
   node index.js
   ```

## API Endpoints

### Authentication (Public)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| POST | `/api/auth/signup` | Register a new user (Status: pending) |
| POST | `/api/auth/login` | Login user (Requires approval) |
| POST | `/api/auth/admin-login` | Login admin using env credentials |

### Admin Actions (Protected - Admin Only)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| GET | `/api/auth/pending-users` | Get all users with 'pending' status |
| PUT | `/api/auth/approve/:id` | Approve a pending user |

### Logout
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| POST | `/api/auth/logout` | Clear auth cookie |

## Example Request/Response

### Signup
**POST** `/api/auth/signup`
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```
**Response (201)**:
```json
{
  "message": "Registration successful. Please wait for admin approval.",
  "user": {
    "id": "...",
    "name": "John Doe",
    "email": "john@example.com",
    "status": "pending"
  }
}
```

### Login (Pending User)
**POST** `/api/auth/login`
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```
**Response (403)**:
```json
{
  "message": "Wait for admin approval"
}
```
