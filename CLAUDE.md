# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

EventPro is a Romanian event supplier marketplace built with Next.js 15, connecting event organizers with service providers. The application uses Supabase as the backend service and supports both client and supplier user types.

## Development Commands

- `npm run dev` - Start development server (localhost:3000)
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint code analysis

## Architecture

### User Types and Authentication
The application supports two distinct user roles:
- **Clients** (`user_type: 'client'`): Event organizers searching for suppliers
- **Suppliers** (`user_type: 'furnizor'`): Service providers offering event services

Authentication flows through Supabase Auth with profile creation in the `profiles` table.

### Database Schema (Supabase)
Key tables and relationships:
- `profiles` - User profiles with user_type field
- `suppliers` - Supplier business profiles linked to user profiles
- `categories` - Service categories (Locații, Muzică, Fotografie, etc.)
- `supplier_categories` - Many-to-many relationship between suppliers and categories
- `unavailable_dates` - Supplier availability calendar
- `localitati` - Romanian cities/localities with județ (county) organization

### Core Components

**LocationPicker** (`components/LocationPicker.js`)
- Advanced location selector with județ/localitate hierarchy
- Integrates with `localitati` table in Supabase
- Supports adding new localities with normalization
- Features search functionality and custom input for new locations

**Calendar** (`components/Calendar.js`)
- Custom calendar component for supplier availability management
- Shows available/unavailable dates with visual indicators
- Supports Romanian month names and date formatting
- Used in dashboard for suppliers to mark unavailable dates

**SupplierCard** (`components/SupplierCard.js`)
- Displays supplier information with image gallery support
- Category badges and availability indicators
- Responsive design with hover effects
- Authentication-aware (shows different content for logged-in users)

### Page Structure

**Home Page** (`app/page.js`)
- Dynamic category-based supplier browsing
- URL-based category filtering (`?categoria=slug`)
- Responsive supplier grid with category grouping
- Authentication-aware UI (different CTA for logged-in users)

**Dashboard** (`app/dashboard/page.js`)
- Role-based dashboard (different for clients vs suppliers)
- Supplier calendar management with undo functionality
- Profile completion tracking
- Quick action links based on user type

**Authentication Pages**
- `app/login/page.js` - Login form
- `app/register/page.js` - Registration with user type selection
- `app/profile/page.js` - Profile management

### Styling Approach

The application uses inline styles with:
- Responsive design patterns using CSS-in-JS
- Custom breakpoints for mobile/tablet/desktop
- Consistent color scheme (blue primary, gray neutrals)
- Romanian-specific UI text and formatting

### Environment Configuration

Required environment variables:
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key

### Romanian Localization

The application is fully localized for Romanian users:
- Romanian month names in Calendar component
- County (județ) names without diacritics for URL compatibility
- Proper date formatting (DD.MM.YYYY)
- Romanian UI text throughout

## Development Guidelines

### Component Patterns
- Use 'use client' directive for interactive components
- Implement responsive design from mobile-first
- Use Supabase client (`@/lib/supabase`) for all database operations
- Handle loading states and error scenarios

### Database Operations
- Always check user authentication before database writes
- Use proper foreign key relationships for data integrity
- Handle Supabase errors gracefully with user feedback
- Implement optimistic UI updates where appropriate (see Dashboard calendar)

### Navigation and Routing
- Use Next.js App Router patterns
- Implement protected routes with authentication checks
- Support URL-based state for filtering (categories, search)
- Use Link components for client-side navigation

### State Management
- Local component state with useState for UI interactions
- Supabase real-time subscriptions where needed
- URL params for shareable application state
- Session storage for user preferences

When working on this codebase, prioritize user experience for Romanian event professionals and maintain the existing responsive design patterns.