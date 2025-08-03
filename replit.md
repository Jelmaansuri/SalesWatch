# SalesTracker Pro

## Overview

SalesTracker Pro is a comprehensive sales and inventory management system built for small to medium businesses. The application provides a complete solution for tracking sales, managing products and customers, analyzing performance metrics, and generating business insights. It features a modern, responsive web interface with support for dark/light themes and is designed with Malaysian business practices in mind, including MYR currency formatting.

## Recent Changes (August 2025)

### Complete Business Management Platform Implementation
- **Customer Management**: Full CRUD with form validation, real-time updates, and comprehensive customer profiles
- **Product Management**: Complete catalog with image upload, edit/delete actions, profit margin calculations, and inventory tracking
- **Sales Management**: Comprehensive order tracking with advanced status workflow (Paid → Pending Shipment → Shipped → Completed)
- **Order Management**: Advanced order lifecycle management with filtering, search, status tracking, and complete edit capabilities
- **Reports & Analytics**: Comprehensive business intelligence dashboard with:
  - Revenue trends and profit analysis
  - Product performance metrics with charts
  - Customer insights and top customer rankings
  - Order status distribution analysis
  - Interactive data visualization with Recharts
  - Export functionality for business reports
- **Authentication System**: Replit Auth with protected routes and secure session management
- **User Interface**: Professional UI with modal dialogs, confirmation alerts, advanced filtering, and comprehensive error handling
- **Data Architecture**: Production-ready with complete analytics backend and real-time metrics

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The frontend is built with React 18 and TypeScript, utilizing Vite as the build tool and development server. The application follows a component-based architecture with:

- **UI Framework**: React with TypeScript for type safety
- **Build Tool**: Vite for fast development and optimized production builds
- **Styling**: Tailwind CSS with shadcn/ui components for consistent, modern UI design
- **State Management**: TanStack React Query for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod for validation
- **Theme System**: Custom theme provider supporting light/dark modes with CSS variables

The frontend follows a modular structure with separate directories for components, pages, hooks, and utilities. Components are organized into layout components, UI primitives, and feature-specific modules like dashboard widgets and modals.

### Backend Architecture
The backend uses Express.js with TypeScript running on Node.js, implementing a RESTful API design:

- **Framework**: Express.js for HTTP server and middleware
- **Language**: TypeScript for type safety and better developer experience
- **API Design**: RESTful endpoints for CRUD operations on customers, products, and sales
- **Error Handling**: Centralized error middleware with proper HTTP status codes
- **Logging**: Custom logging middleware for API request/response tracking
- **Development**: Hot reload support with automatic server restart

The backend implements a service layer pattern with clear separation between route handlers, business logic, and data access layers.

### Data Storage Solutions
The application uses a flexible storage abstraction that supports multiple backends:

- **Database**: PostgreSQL as the primary database
- **ORM**: Drizzle ORM for type-safe database operations and schema management
- **Connection**: Neon Database serverless PostgreSQL for cloud deployment
- **Development Storage**: In-memory storage implementation for development and testing
- **Migrations**: Drizzle Kit for database schema migrations and version control

The storage layer implements a repository pattern with a common interface (IStorage) that allows for easy switching between different storage backends.

### Database Schema Design
The database follows a normalized relational design with three main entities:

- **Customers**: Stores customer information including contact details and company information
- **Products**: Manages product catalog with SKU, pricing, inventory, and status tracking
- **Sales**: Records sales transactions with foreign key relationships to customers and products, including quantity, pricing, profit calculations, and order status

All tables include audit fields (created_at, updated_at) and use UUID primary keys for better scalability and security.

### Authentication and Authorization
Currently implements a session-based approach:

- **Session Management**: Express sessions with PostgreSQL session store
- **Session Storage**: connect-pg-simple for persistent session storage
- **Security**: Secure session configuration with proper cookie settings

The architecture is prepared for more advanced authentication systems that can be implemented as needed.

## External Dependencies

### Database Services
- **Neon Database**: Serverless PostgreSQL database hosting
- **Drizzle ORM**: Type-safe database toolkit and query builder
- **connect-pg-simple**: PostgreSQL session store for Express sessions

### UI and Frontend Libraries
- **Radix UI**: Headless UI components for accessibility and customization
- **shadcn/ui**: Pre-built component library built on Radix UI and Tailwind CSS
- **Recharts**: Chart library for data visualization and analytics
- **TanStack React Query**: Server state management and caching
- **React Hook Form**: Form handling and validation
- **Zod**: TypeScript-first schema validation

### Development and Build Tools
- **Vite**: Frontend build tool and development server
- **TypeScript**: Type checking and enhanced developer experience
- **Tailwind CSS**: Utility-first CSS framework
- **ESBuild**: Fast JavaScript bundler for production builds
- **Replit Plugins**: Development environment integration for hot reloading and debugging

### Utility Libraries
- **date-fns**: Date manipulation and formatting
- **clsx & tailwind-merge**: Conditional CSS class handling
- **nanoid**: Unique ID generation
- **Wouter**: Lightweight client-side routing

The application is designed to be easily deployable on various platforms with minimal configuration changes, supporting both development and production environments with appropriate optimizations for each.