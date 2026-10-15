# NEMS Backend Platform

A robust, enterprise-grade Fastify and Sequelize TypeScript backend based on the `new_platform` architecture.

## 🚀 Features & Architecture

- **Framework**: Fastify v4 (high performance, asynchronous request handling).
- **ORM**: Sequelize with PostgreSQL (and portable SQLite fallback support for local testing).
- **Logging**: Enterprise structured logging with Pino & `pino-pretty`. Every controller, service, repository, and plugin emits structured contextual logs with latency, request IDs, and error traces.
- **Security**: JWT authentication, bcrypt password hashing, token versioning, and role-based access control.
- **Swagger Documentation**: Interactive OpenAPI documentation served at `/docs`.

---

## 👥 Role Hierarchy & Incharge Parity

The system supports 5 primary roles:

| Role | Short Code | Description & Features |
|---|---|---|
| **Super Admin** | `SA` | Root system administrator with complete unrestricted bypass. |
| **Incharge** | `IC` | **Exact same features & privileges as Super Admin**. Bypasses all permission checks, can manage cross-client users, clients, and roles identically to Super Admin. |
| **Admin** | `ADMIN` | Organization administrator managing users, roles, and settings within their assigned client. |
| **Teacher** | `TEACHER` | Faculty member with academic and student oversight permissions. |
| **Student** | `STUDENT` | Standard learner role with student-level access. |

> **Key Rule**: `TokenService.isSuperAdminOrIncharge(userType)` grants `Incharge` identical bypass and elevated authority as `Super Admin`.

---

## 📁 Folder Structure (Identical to `new_platform`)

```
Nems_Backend/
├── .env
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
├── README.md
└── src/
    ├── app.ts                          # Fastify bootstrap, global error handler & hooks
    ├── config/
    │   ├── env.config.ts               # Environment configuration
    │   ├── masterdata.ts               # Seed data for Roles, Permissions, Seed Users
    │   └── swagger.ts                  # Swagger & Swagger UI setup
    ├── constants/
    │   ├── roles-constant.ts           # Role names & short codes
    │   ├── role-short-code-constant.ts # Short code references
    │   └── user-status-constant.ts     # User & Client statuses
    ├── controllers/
    │   ├── auth.controller.ts          # Login & session handlers
    │   ├── client.controller.ts        # Client CRUD controller
    │   ├── role.controller.ts          # Role CRUD & permission assign controller
    │   └── user.controller.ts          # User CRUD controller
    ├── db/
    │   └── hooks/
    │       ├── convert_empty_strings_to_null.ts
    │       └── time_format_hook.ts
    ├── interfaces/
    │   ├── auth.interface.ts
    │   ├── client.interface.ts
    │   ├── decode_token.interface.ts
    │   ├── permission.interface.ts
    │   ├── role.interface.ts
    │   └── user.interface.ts
    ├── loaders/
    │   ├── database.ts                 # Database connectivity check
    │   └── migrations.ts               # Schema synchronizer
    ├── middleware/
    │   ├── token.service.ts            # Permission checks & Super Admin/Incharge bypass
    │   ├── user-context.ts             # User context plugin
    │   └── verify_token.ts             # JWT Bearer token decoder & session check
    ├── models/
    │   ├── action.model.ts             # Action model (C, R, U, D)
    │   ├── client.model.ts             # Client / Organization model
    │   ├── permission.model.ts         # System permissions
    │   ├── role-permission-action.model.ts # Permission-action mapping
    │   ├── role-permission.model.ts    # Role-permission junction
    │   ├── role.model.ts               # Role model
    │   ├── user-mapping.model.ts       # User-to-Client-to-Role mapping
    │   └── user.model.ts               # Root User model with bcrypt hooks
    ├── plugins/
    │   ├── logger-plugins.ts           # Pino logger singleton
    │   ├── modelinitializer-plugin.ts  # Sequelize model & association initializer
    │   └── sequelize-plugin.ts         # Sequelize Fastify plugin & connection pool
    ├── repositories/
    │   ├── client.repository.ts        # Client data access
    │   ├── role.repository.ts          # Role data access
    │   ├── user-mapping.repository.ts  # UserMapping data access
    │   └── user.repository.ts          # User data access
    ├── routes/
    │   ├── auth.route.ts               # /auth routes
    │   ├── client.route.ts             # /clients routes
    │   ├── role.route.ts               # /roles routes
    │   ├── user.route.ts               # /users routes
    │   └── index.ts                    # Main route aggregator
    ├── services/
    │   ├── auth.service.ts             # Authentication logic & token generation
    │   ├── client.service.ts           # Client CRUD business logic
    │   ├── role.service.ts             # Role CRUD business logic
    │   └── user.service.ts             # User CRUD business logic
    └── utility/
        ├── encryption.util.ts          # Password hashing
        ├── jsonUtils.ts                # Safe JSON parser
        ├── pagination.util.ts          # Query pagination helper
        └── user.utility.ts             # Role normalizer & phone validation
```

---

## 📡 API Endpoints

### 1. Authentication (`/api/auth`)
- `POST /api/auth/login` - Authenticate with email/phone & password. Returns JWT token.
- `GET /api/auth/me` - Get authenticated user profile (`Bearer {token}`).

### 2. Client Management (`/api/clients`)
- `GET /api/clients` - List clients (supports `?page=1&limit=10&k=search&status=active`).
- `GET /api/clients/:id` - Get client by ID (includes user count and roles).
- `POST /api/clients` - Create client (automatically initializes default Incharge, Admin, Teacher, Student roles).
- `PUT /api/clients/:id` - Update client information.
- `DELETE /api/clients/:id` - Soft delete client (prevents deletion if active users exist).

### 3. Role Management (`/api/roles`)
- `GET /api/roles/client/:client_id` - List roles for a client (with user counts).
- `GET /api/roles/client/:client_id/:id` - Get role by ID with permissions.
- `POST /api/roles/client/:client_id` - Create role under a client.
- `PUT /api/roles/client/:client_id/:id` - Update role name, short code, permissions.
- `DELETE /api/roles/client/:client_id/:id` - Soft delete role (prevents deletion of system roles or roles with assigned users).
- `PATCH /api/roles/client/:client_id/:id/assign` - Assign permission IDs to a role.
- `GET /api/roles/permissions` - List all system permissions.

### 4. User Management (`/api/users`)
- `GET /api/users/client/:client_id` - List users under client (supports `?k=search&role_name=teacher&status=active&page=1&limit=10`).
- `GET /api/users/client/:client_id/:id` - Get user details under client.
- `GET /api/users/:id` - Get user by ID.
- `POST /api/users/client/:client_id` - Create user under client with role (`superadmin`, `incharge`, `admin`, `teacher`, `student`).
- `PUT /api/users/client/:client_id/:id` - Update user details and role.
- `DELETE /api/users/client/:client_id/:id` - Soft delete user mapping from client.

---

## 🪵 Proper Logging

Proper logging is integrated in every layer:
1. **Server Hooks**:
   - `onRequest`: Logs request ID, method, URL, IP, user-agent.
   - `onResponse`: Logs response time and status code.
   - `onError`: Logs exceptions with stack trace.
2. **Controllers**: Log incoming arguments and execution progress.
3. **Services**: Log business logic steps, transaction commits, and warnings on validation failures.
4. **Repositories**: Log database queries and affected rows.
5. **Pino-Pretty**: Formatted, colorized terminal output in development mode.

---

## 🛠️ Setup & Running

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Database**:
   Update `.env` with your PostgreSQL credentials, or set `DATABASE_DIALECT=sqlite` for instant local testing.

3. **Start Development Server**:
   ```bash
   npm run dev
   ```

4. **Access Swagger UI**:
   Open [http://localhost:8800/docs](http://localhost:8800/docs) in your browser.
