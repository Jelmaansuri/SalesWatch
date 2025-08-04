# PROGENY AGROTECH Management System

## Overview
The PROGENY AGROTECH Management System is a comprehensive business management platform designed for PROGENY AGROTECH, a Malaysian agricultural company specializing in fresh young ginger farming and distribution. Its core purpose is to provide a complete solution for tracking sales, managing ginger products and customers, analyzing farm performance, and generating agricultural business insights. The system aims to streamline operations, enhance decision-making through data analytics, and support the growth of PROGENY AGROTECH's farm-to-market operations. Key capabilities include full CRM, product and sales management, detailed plot management for agricultural land, robust reporting with Excel export, and a modern, responsive web interface tailored for Malaysian agricultural practices.

## User Preferences
Preferred communication style: Simple, everyday language.
Company: PROGENY AGROTECH - Malaysian fresh young ginger farming and agriculture business.
Focus: Agricultural business management, ginger production, farm-to-market operations.

## System Architecture

### Frontend Architecture
The frontend is built with React 18 and TypeScript, using Vite for development and optimized builds. It follows a component-based architecture with Tailwind CSS and shadcn/ui for consistent, modern UI design. State management is handled by TanStack React Query, routing by Wouter, and form handling with React Hook Form and Zod for validation. It supports dark/light themes via a custom theme provider.

### Backend Architecture
The backend uses Express.js with TypeScript, implementing a RESTful API. It follows a service layer pattern, separating route handlers, business logic, and data access. It includes centralized error handling and custom logging middleware.

### Data Storage Solutions
The application primarily uses PostgreSQL as its database, managed with Drizzle ORM for type-safe operations and schema management. Neon Database provides serverless PostgreSQL hosting. An in-memory storage implementation is available for development and testing. Drizzle Kit is used for database schema migrations.

### Database Schema Design
The database design is normalized and relational, centering on three main entities: Customers, Products, and Sales. These entities include comprehensive details and foreign key relationships, with audit fields and UUID primary keys for scalability and security.

### Authentication and Authorization
A session-based approach is implemented using Express sessions with a PostgreSQL session store (connect-pg-simple) for persistent and secure session management.

## External Dependencies

### Database Services
- **Neon Database**: Serverless PostgreSQL hosting.
- **Drizzle ORM**: Type-safe database toolkit and query builder.
- **connect-pg-simple**: PostgreSQL session store for Express sessions.

### UI and Frontend Libraries
- **Radix UI**: Headless UI components for accessibility.
- **shadcn/ui**: Component library built on Radix UI and Tailwind CSS.
- **Recharts**: Charting library for data visualization.
- **TanStack React Query**: Server state management and caching.
- **React Hook Form**: Form handling and validation.
- **Zod**: TypeScript-first schema validation.

### Development and Build Tools
- **Vite**: Frontend build tool and development server.
- **TypeScript**: Type checking.
- **Tailwind CSS**: Utility-first CSS framework.
- **ESBuild**: Fast JavaScript bundler.

### Utility Libraries
- **date-fns**: Date manipulation and formatting.
- **clsx & tailwind-merge**: Conditional CSS class handling.
- **nanoid**: Unique ID generation.
- **Wouter**: Lightweight client-side routing.