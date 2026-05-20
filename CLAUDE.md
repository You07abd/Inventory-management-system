# Inventory Management System

## Codex Integration

For this project, proactively delegate to Codex using the `codex:rescue` skill without waiting to be asked. Use it for:

- Any implementation task spanning multiple files
- Debugging sessions where the root cause isn't immediately obvious
- Refactoring or restructuring existing code
- Writing or updating tests
- Any task that would benefit from autonomous code execution and iteration

When in doubt, delegate. Claude Code orchestrates; Codex executes.

## Project

<!-- Fill in as the project takes shape -->
- **Type:** Inventory Management System
- **Stack:** ### 

### Backend

Use:

- Python
- FastAPI
- PostgreSQL
- SQLAlchemy or SQLModel
- Pydantic
- Uvicorn
- python-qrcode or equivalent QR generation package
- python-dotenv for environment variables
- Alembic for migrations, optional for MVP

### Important Backend Clarification

There should only be one backend:

```text
Python FastAPI backend only
```

Do not create an Express.js, Node.js, Next.js API route backend, or any other JavaScript backend.

Node.js is used only because the React frontend needs it for:

```text
npm install
npm run dev
npm run build
```

The frontend should call the Python FastAPI backend through REST API endpoints.


### Frontend

Use:

- React
- Vite
- Node.js, only for running/building the React frontend
- React Router
- Axios or Fetch API
- Tailwind CSS, optional
- QR scanner library, optional for MVP

### Database

Use:

- PostgreSQL
