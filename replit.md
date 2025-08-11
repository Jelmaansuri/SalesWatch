# PROGENY AGROTECH Management System

## Overview
PROGENY AGROTECH Management System is a comprehensive business management platform for PROGENY AGROTECH, a Malaysian agricultural company specializing in premium fresh young ginger farming and distribution. The application provides solutions for tracking sales, managing ginger products and customers, analyzing farm performance, and generating agricultural business insights. It features a modern, responsive web interface with dark/light theme support, designed for Malaysian agricultural practices, including MYR currency formatting. Key capabilities include full CRUD operations for customer, product, and sales management, advanced order tracking, comprehensive business intelligence dashboards with detailed Excel export, and a dedicated Plot Management System for agricultural land tracking and harvest accumulation.

**UNIFIED BUSINESS ACCESS**: The system operates as a single business account where two whitelisted users (afiqsyahmifaridun@gmail.com and progenyagrotech@gmail.com) share identical access to ALL business data, settings, and functionality across every module including sales, customers, products, plots, and invoices.

**RECENT ENHANCEMENTS (Aug 2025)**: Enhanced Invoice Module with advanced table functionality matching Sales module, improved Plot Cycle Date Flexibility allowing past, present, and future date selection for agricultural planning with proper plot card reflection of selected dates, **Complete Harvest Data Edit Functionality** with full CRUD operations including form validation, auto-calculation of totals, and Malaysian currency formatting, and **Fixed Harvest Log Duplication Issue** by standardizing React Query cache keys and improving cache invalidation logic.

## User Preferences
Preferred communication style: Simple, everyday language.
Company: PROGENY AGROTECH - Malaysian fresh young ginger farming and agriculture business.
Focus: Agricultural business management, ginger production, farm-to-market operations.

## System Architecture

### Frontend Architecture
The frontend is built with React 18 and TypeScript, using Vite. It employs a component-based architecture with:
- **UI Framework**: React with TypeScript.
- **Build Tool**: Vite.
- **Styling**: Tailwind CSS with shadcn/ui components.
- **State Management**: TanStack React Query for server state.
- **Routing**: Wouter.
- **Form Handling**: React Hook Form with Zod for validation.
- **Theme System**: Custom provider supporting light/dark modes.
The structure is modular, separating components, pages, hooks, and utilities, with components organized into layout, UI primitives, and feature-specific modules.

### Backend Architecture
The backend uses Express.js with TypeScript and implements a RESTful API design:
- **Framework**: Express.js.
- **Language**: TypeScript.
- **API Design**: RESTful endpoints for CRUD operations.
- **Error Handling**: Centralized middleware with HTTP status codes.
- **Logging**: Custom middleware for API request/response tracking.
The backend separates route handlers, business logic, and data access layers.

### Data Storage Solutions
The application utilizes a flexible storage abstraction:
- **Database**: PostgreSQL as the primary database.
- **ORM**: Drizzle ORM for type-safe operations.
- **Connection**: Neon Database serverless PostgreSQL.
- **Migrations**: Drizzle Kit for schema management.
The storage layer uses a repository pattern via a common `IStorage` interface.

### Database Schema Design
The database follows a normalized relational design with three main entities:
- **Customers**: Stores contact and company information.
- **Products**: Manages catalog with SKU, pricing, inventory, and status.
- **Sales**: Records transactions with relationships to customers and products, including quantity, pricing, profit, and order status.
All tables include audit fields (`created_at`, `updated_at`) and use UUID primary keys.

### Authentication and Authorization
Currently implements a session-based approach:
- **Session Management**: Express sessions with PostgreSQL session store.
- **Session Storage**: `connect-pg-simple` for persistent storage.
- **Security**: Secure session configuration.

## External Dependencies

### Database Services
- **Neon Database**: Serverless PostgreSQL hosting.
- **Drizzle ORM**: Type-safe database toolkit.
- **connect-pg-simple**: PostgreSQL session store.

### UI and Frontend Libraries
- **Radix UI**: Headless UI components.
- **shadcn/ui**: Component library based on Radix UI and Tailwind CSS.
- **Recharts**: Chart library for data visualization.
- **TanStack React Query**: Server state management.
- **React Hook Form**: Form handling.
- **Zod**: Schema validation.

### Development and Build Tools
- **Vite**: Frontend build tool.
- **TypeScript**: Type checking.
- **Tailwind CSS**: Utility-first CSS framework.
- **ESBuild**: JavaScript bundler.

### Utility Libraries
- **date-fns**: Date manipulation.
- **clsx & tailwind-merge**: Conditional CSS class handling.
- **nanoid**: Unique ID generation.
- **Wouter**: Lightweight routing.