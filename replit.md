# PROGENY AGROTECH Management System

## Overview

PROGENY AGROTECH Management System is a comprehensive business management platform designed specifically for PROGENY AGROTECH, a Malaysian agricultural company specializing in premium fresh young ginger farming and distribution. The application provides a complete solution for tracking sales, managing ginger products and customers, analyzing farm performance metrics, and generating agricultural business insights. It features a modern, responsive web interface with support for dark/light themes and is designed with Malaysian agricultural business practices in mind, including MYR currency formatting.

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
  - **NEW: Detailed Excel Export System** - Professional 5-sheet Excel reports with PROGENY AGROTECH branding
- **Authentication System**: Replit Auth with protected routes and secure session management
- **User Interface**: Professional UI with modal dialogs, confirmation alerts, advanced filtering, and comprehensive error handling
- **Data Architecture**: Production-ready with complete analytics backend and real-time metrics
- **Security Implementation**: Internal team access control with email/domain whitelist, unauthorized access prevention, and secure authentication flow

### Latest Updates (August 4, 2025)
- **PRODUCTION DEPLOYMENT FIXED**: Successfully resolved critical live environment API routing issues:
  - Fixed API routes being intercepted by static file serving in production
  - Database connection working properly with PostgreSQL persistence  
  - All CRUD operations now functioning in both development and live environments
  - Added comprehensive error logging and health check endpoint
  - User-specific data isolation fully operational with proper database storage
- **PREVIOUS FIXES (August 3, 2025)**:
  - Database persistence switched from MemStorage to DatabaseStorage
  - Session management enhanced with 30-day rolling sessions
  - All data now persists properly across server restarts

### Latest Updates (Previous)
- **Date Selection Feature**: Added comprehensive date picker to Add Sale form:
  - Calendar widget with today's date as default
  - Full customization capability for backdating or future sales
  - Clean dropdown format with formatted date display
  - Database schema updated with sale_date field
  - Backend support for custom sale dates
- **Platform Source Tracking**: Implemented marketing channel analytics:
  - Dropdown options: TikTok, Facebook, WhatsApp, Others
  - Required field validation for platform selection
  - Database schema updated with platform_source field
  - Sales table includes Platform column for transaction records
  - Marketing analytics ready for future reporting insights
- **Status Workflow Updates**: Enhanced order lifecycle descriptions:
  - Updated workflow to include "Unpaid" status
  - Complete flow: Unpaid → Paid → Pending Shipment → Shipped → Completed
  - Consistent descriptions across Sales and Orders pages
  - Form validation and backend support for all status types
- **Excel Export System**: Implemented comprehensive Excel reporting with 5 detailed worksheets:
  - Executive Summary with key business metrics
  - Detailed Sales with every transaction and profit analysis
  - Customer Analysis with performance rankings and loyalty metrics
  - Product Performance with sales data and profit margins
  - Monthly Analysis with growth trends and business intelligence
- **Form Validation Fix**: Resolved Create Sale button functionality with proper form schema validation
- **Enhanced Reporting**: Backend API endpoints for detailed business analytics and export functionality
- **Inventory Stock Management**: Complete implementation of real-time stock tracking system:
  - Automatic stock deduction when orders are created
  - Stock restoration when orders are deleted or quantities reduced
  - Real-time stock validation to prevent overselling
  - Visual stock indicators on products page (green >10, yellow 1-10, red 0)
  - Stock availability display in sale creation forms
  - Automatic UI updates across all pages when stock changes
- **Quick-Add Functionality**: Enhanced sales form with instant customer/product creation:
  - "Add New Customer" option in customer dropdown
  - "Add New Product" option in product dropdown
  - Modal forms for quick data entry without leaving sales page
  - Automatic selection of newly created records in the form
  - Seamless workflow for rapid sales entry

## User Preferences

Preferred communication style: Simple, everyday language.
Company: PROGENY AGROTECH - Malaysian fresh young ginger farming and agriculture business.
Focus: Agricultural business management, ginger production, farm-to-market operations.

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