# Fundamental Design - Claude Code Configuration

## Project Overview

This is a modern web application built with:
- **Next.js 15**: React framework with App Router
- **TypeScript**: Full type safety
- **Drizzle ORM**: Type-safe database access
- **PostgreSQL (Neon)**: Serverless database
- **Tailwind CSS**: Utility-first styling

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set up environment (copy .env.example to .env.local)
# Then add your DATABASE_URL from Neon

# 3. Generate database migrations
npm run db:generate

# 4. Apply migrations
npm run db:migrate

# 5. Start development server
npm run dev
```

## Project Structure Explained

```
Fundamental-Design/
├── app/                    # Next.js pages and API routes
│   ├── page.tsx           # Home page (/)
│   ├── layout.tsx         # Root layout wrapper
│   ├── globals.css        # Global styles
│   └── api/               # API endpoints
│       └── users/route.ts # /api/users endpoint
│
├── db/                    # Database layer
│   ├── schema.ts          # Table definitions
│   ├── index.ts           # Database connection
│   └── migrations/        # Auto-generated migrations
│
├── public/                # Static files (images, fonts)
│
├── scripts/               # Utility scripts
│
└── Configuration files:
    ├── package.json       # Dependencies and scripts
    ├── tsconfig.json      # TypeScript config
    ├── next.config.ts     # Next.js config
    ├── drizzle.config.ts  # Database config
    ├── tailwind.config.ts # Styling config
    └── .env.example       # Environment template
```

## Common Commands

| Command | What it does |
|---------|-------------|
| `npm run dev` | Start development server (localhost:3000) |
| `npm run build` | Build for production |
| `npm start` | Run production server |
| `npm run lint` | Check code quality |
| `npm run db:generate` | Create database migrations |
| `npm run db:migrate` | Apply migrations to database |
| `npm run db:studio` | Open Drizzle Studio (visual DB editor) |

## Learning Resources

### Next.js
- [App Router Docs](https://nextjs.org/docs/app)
- [API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)

### Drizzle ORM
- [Drizzle Docs](https://orm.drizzle.team)
- [PostgreSQL Support](https://orm.drizzle.team/docs/get-started-postgresql)
- [Query Examples](https://orm.drizzle.team/docs/select)

### TypeScript
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React + TypeScript](https://react.dev/learn/typescript)

### Tailwind CSS
- [Utility Classes](https://tailwindcss.com/docs/utility-first)
- [Component Examples](https://tailwindcss.com/docs/components)

## Database Setup (Neon)

1. Go to [Neon Console](https://console.neon.tech)
2. Create a new project
3. Copy the connection string
4. Add to `.env.local`: `DATABASE_URL=your_connection_string`
5. Run `npm run db:generate` to create initial migration
6. Run `npm run db:migrate` to apply it

## Adding a New Feature

### Example: Create a "Comments" feature

1. **Add to schema** (`db/schema.ts`):
   ```typescript
   export const comments = pgTable("comments", {
     id: uuid("id").primaryKey().defaultRandom(),
     postId: uuid("post_id").notNull(),
     content: text("content").notNull(),
     createdAt: timestamp("created_at").defaultNow().notNull(),
   });
   ```

2. **Generate migration**:
   ```bash
   npm run db:generate
   ```

3. **Apply migration**:
   ```bash
   npm run db:migrate
   ```

4. **Create API endpoint** (`app/api/comments/route.ts`):
   - GET: Fetch comments
   - POST: Create comment
   - DELETE: Delete comment

5. **Build UI** (React components in `app/`)

## Claude Code Tips

- Use `/code-review` to get feedback on your code
- Use `/run` to start the dev server
- Use `/loop` for continuous builds
- Ask me to explain any file or concept!

---

**Built with ❤️ using Next.js and Drizzle ORM**
