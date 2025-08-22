# Technology Stack & Build System

## Core Technologies

### Frontend Framework
- **React 18** with TypeScript for type-safe component development
- **Vite** as the build tool and development server
- **JSX/TSX** for component templates

### UI & Styling
- **Tailwind CSS** for utility-first styling and responsive design
- **Lucide React** for consistent iconography
- **Recharts** for data visualization and charts
- **PostCSS** with Autoprefixer for CSS processing

### Data & State Management
- **React Hooks** (useState, useReducer, useContext) for state management
- **Dexie.js** for IndexedDB operations and offline data storage
- **Local Storage** for lightweight data persistence
- **Custom hooks** for business logic encapsulation

### PWA & Performance
- **Vite PWA Plugin** for Progressive Web App features
- **Workbox** for service worker and caching strategies
- **Web App Manifest** for installable app experience

### Code Quality & Development
- **TypeScript** with strict mode for type safety
- **ESLint** with React and TypeScript rules
- **Prettier** for consistent code formatting
- **Path aliases** (@/, @/components, @/hooks, etc.) for clean imports

## Build Commands

### Development
```bash
npm run dev          # Start development server on port 3000
npm run type-check   # Run TypeScript type checking without emitting files
```

### Production
```bash
npm run build        # Build for production (TypeScript compilation + Vite build)
npm run preview      # Preview production build locally on port 4173
```

### Code Quality
```bash
npm run lint         # Run ESLint with error reporting
npm run lint:fix     # Run ESLint with automatic fixes
npm run format       # Format code with Prettier
npm run format:check # Check code formatting without changes
```

## Project Configuration

### TypeScript Configuration
- **Target**: ES2020 with modern JavaScript features
- **Module**: ESNext with bundler resolution
- **Strict mode** enabled with comprehensive linting rules
- **Path mapping** configured for clean imports
- **JSX**: react-jsx for optimized React 18 JSX transform

### Vite Configuration
- **Plugins**: React, PWA with auto-update
- **Build optimization**: Code splitting, tree shaking, terser minification
- **Chunk splitting**: Vendor libraries separated for better caching
- **Development**: Hot module replacement, fast refresh

### PWA Configuration
- **Manifest**: Configured for mobile app experience
- **Service Worker**: Auto-update strategy with runtime caching
- **Offline support**: Static assets and API responses cached
- **Icons**: Multiple sizes for different devices

## Development Guidelines

### File Organization
- Use path aliases (@/) for all internal imports
- Keep components small and focused on single responsibilities
- Separate business logic into custom hooks
- Use TypeScript interfaces for all data structures

### Performance Considerations
- Lazy load components and routes when possible
- Use React.memo for expensive components
- Implement proper dependency arrays in useEffect
- Optimize bundle size with dynamic imports

### Mobile Optimization
- Design mobile-first with responsive breakpoints
- Use touch-friendly UI elements (minimum 44px touch targets)
- Implement proper loading states and error boundaries
- Consider network conditions and offline scenarios