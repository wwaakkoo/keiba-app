# Project Structure & Organization

## Root Directory Structure

```
keiba-mobile-app/
├── .kiro/                    # Kiro AI assistant configuration
│   ├── settings/            # MCP and other settings
│   ├── specs/               # Feature specifications
│   └── steering/            # AI guidance documents
├── .vscode/                 # VS Code workspace settings
├── src/                     # Source code
├── public/                  # Static assets
├── dist/                    # Build output (generated)
└── node_modules/            # Dependencies (generated)
```

## Source Code Organization (`src/`)

```
src/
├── components/              # React UI components
│   ├── common/             # Reusable UI components
│   ├── race/               # Race management components
│   ├── prediction/         # Prediction display components
│   ├── statistics/         # Analytics and charts
│   └── investment/         # Investment tracking components
├── hooks/                  # Custom React hooks
├── services/               # Business logic and data processing
├── types/                  # TypeScript type definitions
├── utils/                  # Utility functions and helpers
├── stores/                 # State management (future)
├── assets/                 # Images, fonts, etc.
├── App.tsx                 # Main application component
├── main.tsx               # Application entry point
└── index.css              # Global styles and Tailwind imports
```

## Component Architecture

### Component Categories

1. **Common Components** (`src/components/common/`)
   - Reusable UI elements (buttons, cards, modals)
   - Layout components (headers, navigation)
   - Form components (inputs, selectors)

2. **Feature Components** (`src/components/{feature}/`)
   - Domain-specific components grouped by feature
   - Each feature has its own subdirectory
   - Components should be focused and single-purpose

3. **Page Components** (Top-level in `src/components/`)
   - Main application views
   - Compose multiple feature components
   - Handle routing and navigation

### Naming Conventions

- **Components**: PascalCase (e.g., `RaceManager.tsx`, `PredictionCard.tsx`)
- **Hooks**: camelCase with `use` prefix (e.g., `useDataManager.ts`, `usePrediction.ts`)
- **Services**: camelCase with descriptive suffix (e.g., `predictionService.ts`, `dataParsingService.ts`)
- **Types**: PascalCase interfaces (e.g., `PredictionResult`, `HorseAnalysis`)
- **Utils**: camelCase functions (e.g., `formatCurrency.ts`, `dateHelpers.ts`)

## Data Flow Architecture

### Service Layer Pattern
```
Components → Custom Hooks → Services → Data Storage
```

1. **Components**: Pure UI components that receive props and emit events
2. **Custom Hooks**: Encapsulate business logic and state management
3. **Services**: Handle data processing, calculations, and external integrations
4. **Data Storage**: IndexedDB (Dexie) for persistence, LocalStorage for settings

### Key Services

- **`predictionService.ts`**: Core prediction algorithms and horse analysis
- **`dataParsingService.ts`**: Parse external data (netkeiba, CSV imports)
- **`investmentService.ts`**: Investment tracking and ROI calculations
- **`statisticsService.ts`**: Analytics and performance metrics
- **`storageService.ts`**: Data persistence and synchronization

## File Organization Rules

### Import Structure
```typescript
// 1. External libraries
import React from 'react';
import { useState } from 'react';

// 2. Internal imports (using path aliases)
import { PredictionResult } from '@/types/prediction';
import { usePrediction } from '@/hooks/usePrediction';
import { predictionService } from '@/services/predictionService';

// 3. Relative imports (same directory)
import './Component.css';
```

### Path Aliases Configuration
- `@/*` → `src/*` (root source directory)
- `@/components/*` → `src/components/*`
- `@/hooks/*` → `src/hooks/*`
- `@/services/*` → `src/services/*`
- `@/types/*` → `src/types/*`
- `@/utils/*` → `src/utils/*`
- `@/stores/*` → `src/stores/*`

## Type Definitions Structure

### Core Domain Types (`src/types/`)

- **`prediction.ts`**: Prediction engine types (PredictionResult, HorseAnalysis, etc.)
- **`race.ts`**: Race and horse data structures
- **`investment.ts`**: Investment tracking and financial types
- **`statistics.ts`**: Analytics and reporting types
- **`ui.ts`**: UI component prop types and state interfaces

### Type Organization Principles

1. **Domain Separation**: Group related types by business domain
2. **Interface Naming**: Use descriptive names that reflect the data structure
3. **Composition**: Build complex types from simpler base types
4. **Export Strategy**: Export all types from index files for clean imports

## Configuration Files

### Root Configuration
- **`package.json`**: Dependencies, scripts, and project metadata
- **`tsconfig.json`**: TypeScript compiler configuration
- **`vite.config.ts`**: Build tool and development server settings
- **`tailwind.config.js`**: CSS framework configuration
- **`.eslintrc.cjs`**: Code linting rules
- **`.prettierrc`**: Code formatting rules

### Development Workflow
1. Use `npm run dev` for development with hot reload
2. Run `npm run type-check` before commits
3. Use `npm run lint:fix` to auto-fix code issues
4. Format code with `npm run format` before commits
5. Build production with `npm run build`

## Mobile-First Considerations

### Responsive Design Structure
- Design components mobile-first (320px+)
- Use Tailwind responsive prefixes (`sm:`, `md:`, `lg:`)
- Implement touch-friendly interactions
- Consider thumb-reach zones for navigation

### Performance Structure
- Lazy load non-critical components
- Use React.memo for expensive renders
- Implement proper loading states
- Optimize images and assets for mobile networks

### PWA Structure
- Service worker handles offline functionality
- Manifest.json defines app installation behavior
- Cache strategies for different content types
- Background sync for data updates