# Agents Configuration

This file helps Claude understand how to assist with this project.

## Available Skills

### Code Review
Use `/code-review` to analyze code for bugs and improvements.

### Run Project
Use `/run` to start the development server at http://localhost:3000

### Linting
Use `npm run lint` to check code quality

## Quick Reference

| Task | Command |
|------|---------|
| Start dev server | `npm run dev` |
| Build for production | `npm run build` |
| Generate DB migration | `npm run db:generate` |
| Apply migrations | `npm run db:migrate` |
| View database visually | `npm run db:studio` |
| Check code quality | `npm run lint` |

## Project Context

**Tech Stack:**
- Framework: Next.js 15
- Language: TypeScript
- Database: PostgreSQL (Neon) with Drizzle ORM
- Styling: Tailwind CSS
- API Style: REST endpoints under `/api/*`

**Key Folders:**
- `app/` - Pages and routes
- `db/` - Database schema and queries
- `app/api/` - API endpoints

## Common Tasks

### Adding a new database table
1. Define table in `db/schema.ts`
2. Run `npm run db:generate`
3. Run `npm run db:migrate`
4. Create API endpoint in `app/api/`

### Creating a new page
1. Create file: `app/new-feature/page.tsx`
2. Add React component
3. Next.js automatically creates the route

### Debugging database issues
1. Run `npm run db:studio` to open visual editor
2. Check migrations in `db/migrations/`
3. Verify `.env.local` has valid DATABASE_URL
