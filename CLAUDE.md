# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Japanese horse racing prediction and investment management mobile application built with React, TypeScript, and Vite. The app is designed as a Progressive Web App (PWA) with offline capabilities using IndexedDB for local data storage.

## Development Commands

### Core Development
- `npm run dev` - Start development server on port 3000
- `npm run build` - Build for production (runs TypeScript compilation + Vite build)
- `npm run preview` - Preview production build on port 4173
- `npm run type-check` - Run TypeScript type checking without emitting files

### Code Quality
- `npm run lint` - Run ESLint with error reporting
- `npm run lint:fix` - Run ESLint and auto-fix issues
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting without changes

## Architecture Overview

### Application Structure
The app follows a screen-based navigation pattern with a single-page application structure:
- **Screens**: HomeScreen, InvestmentScreen, HistoryScreen, SettingsScreen
- **Core Features**: Race creation, prediction engine, investment tracking, statistics
- **Data Flow**: App.tsx manages view state and data flow between screens

### Key Technical Components

#### Database Layer (Dexie + IndexedDB)
- `src/services/database.ts` - Main database class with tables for races, predictions, investments, settings, syncStatus
- `src/services/repositories/` - Repository pattern for data access
- Database auto-initializes with default settings on first run

#### PWA Configuration
- Uses `vite-plugin-pwa` with Workbox for caching strategies
- Service worker at `public/sw.js` handles offline functionality
- Caching strategies configured for different resource types (fonts, images, API calls)
- Offline page available at `public/offline.html`

#### Path Aliases
All imports use path aliases defined in both `tsconfig.json` and `vite.config.ts`:
- `@/` → `src/`
- `@/components/` → `src/components/`
- `@/hooks/` → `src/hooks/`
- `@/services/` → `src/services/`
- `@/types/` → `src/types/`
- `@/utils/` → `src/utils/`

### Component Architecture

#### Screen Components (`src/components/screens/`)
- Main application views that handle routing and top-level state
- Each screen receives navigation callbacks and data from App.tsx

#### Feature Components
- `src/components/race/` - Race creation and management
- `src/components/prediction/` - Horse prediction and analysis
- `src/components/investment/` - Betting and investment tracking
- `src/components/statistics/` - Data analysis and reporting
- `src/components/common/` - Shared UI components and PWA features

#### Hooks (`src/hooks/`)
- `useDataManager.ts` - Main data management hook for predictions and statistics
- `usePWAFeatures.ts` - PWA installation and update notifications
- `useOfflineSync.ts` - Offline data synchronization
- `useOnlineStatus.ts` - Network connectivity tracking

### Data Types (`src/types/`)
- `race.ts` - Race, Horse, and PastRace interfaces
- `investment.ts` - Investment tracking and statistics types
- `prediction.ts` - Prediction results and analysis types

### Services Architecture
- **Repository Pattern**: Data access layer with dedicated repositories for each entity
- **Offline Support**: Queue system for offline operations with sync capability
- **Export/Import**: Data backup and restore functionality
- **Background Sync**: Automatic data synchronization when online

## Mobile-First Design

### Tailwind Configuration
- Custom mobile breakpoints and touch-optimized sizing
- Safe area insets for mobile devices (`safe-top`, `safe-bottom`)
- Mobile-specific grid layouts and animations
- Custom color palette optimized for racing data visualization

### PWA Features
- Automatic updates with user notifications
- Install prompts for home screen installation
- Offline functionality with data caching
- Touch-optimized interactions and swipe gestures

## Development Notes

### Japanese Language Support
- UI text and comments are primarily in Japanese
- Horse racing terminology uses standard Japanese racing terms
- Venue names use official Japanese track names

### Data Validation
- TypeScript strict mode enabled for type safety
- All database operations include proper error handling
- Input validation for race data and investment amounts

### Performance Optimizations
- Vite build optimization with manual chunk splitting
- Service worker caching strategies for different resource types
- Lazy loading patterns for large components
- IndexedDB for efficient local data storage

## Testing
No test framework is currently configured. When adding tests, check for existing test patterns or ask the user for preferred testing approach.