This is a [Next.js](https://nextjs.org) project with SurveyJS integration and MSSQL database connectivity for managing survey question sets.

## Features

- **Survey Management**: Create and manage survey question sets
- **SurveyJS Integration**: Advanced survey rendering with custom properties
- **Database Integration**: MSSQL database connectivity for persistent data storage
- **TypeScript**: Full TypeScript support for type safety
- **Modern UI**: Clean, responsive interface built with Tailwind CSS

## Database Setup

1. **Configure Environment Variables**: Copy the `.env.local` file and update it with your MSSQL connection details:

```env
# Database Configuration
DATABASE_URL="Server=your-server-name;Database=your-database-name;User Id=your-username;Password=your-password;TrustServerCertificate=true;"

# Or use individual parameters
DB_SERVER=your-server-name
DB_DATABASE=your-database-name
DB_USER=your-username
DB_PASSWORD=your-password
DB_PORT=1433
DB_ENCRYPT=true
DB_TRUST_SERVER_CERTIFICATE=true
```

2. **Database Schema**: Ensure your MSSQL database has the following tables:
   - `QuestionSetHeader`: Stores question set information
   - `QuestionSetQuestion`: Stores individual questions within question sets

3. **Test Connection**: After configuration, test your database connection by visiting `/api/test-db`

## Getting Started

First, install dependencies:

```bash
npm install
```

Then, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

- `/src/app` - Next.js app router pages and API routes
- `/src/lib` - Database configuration and utilities
- `/src/services` - Database service layer
- `/src/types` - TypeScript type definitions
- `/src/components` - React components (if added)

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
