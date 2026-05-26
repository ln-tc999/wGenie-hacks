# DeFi Panda

> Comprehensive analytics platform for ERC4626 vault investments

## Table of Contents

- [DeFi Panda](#defi-panda)
  - [Table of Contents](#table-of-contents)
  - [Project Description](#project-description)
    - [Core Value Proposition](#core-value-proposition)
    - [Key Features](#key-features)
    - [Target Users](#target-users)
  - [Tech Stack](#tech-stack)
  - [Getting Started Locally](#getting-started-locally)
    - [Prerequisites](#prerequisites)
    - [Installation](#installation)
  - [Available Scripts](#available-scripts)
  - [Project Scope](#project-scope)
    - [Included in MVP](#included-in-mvp)
    - [Explicitly Excluded from MVP](#explicitly-excluded-from-mvp)
    - [Technical Boundaries](#technical-boundaries)
  - [Project Status](#project-status)
  - [License](#license)

## Project Description

DeFi Panda is a web-based analytics platform designed to provide comprehensive insights into ERC4626
vault investments. The platform serves as a centralized hub for DeFi investors, analysts, and
data-driven users who need reliable, transparent data about DeFi vault performance and activities.

### Core Value Proposition

DeFi Panda aggregates and presents comprehensive ERC4626 vault data that is often hidden or
unavailable on individual protocol websites, enabling users to make informed investment decisions
through technical and fundamental analysis.

### Key Features

- **Vault Directory System**: Browse and filter comprehensive ERC4626 vault listings with advanced
  filtering by TVL, depositor count, net flow, and underlying assets
- **Detailed Vault Analytics**: Individual vault pages with tabbed navigation (Overview, Depositors,
  Activity, Performance)
- **Data Visualization**: Interactive charts and tables for TVL trends, share price performance, and
  transaction history
- **State Persistence**: Filter and sort preferences saved across sessions

### Target Users

- DeFi investors seeking comprehensive vault data
- Financial analysts conducting technical and fundamental analysis
- Data-driven power users and DeFi enthusiasts

## Tech Stack

- **Framework**: Astro 5.5.5
- **Frontend**: React 19.0.0, TypeScript 5
- **Styling**: Tailwind CSS 4.0.17
- **UI Components**: shadcn/ui, Lucide React
- **Data Management**: Tanstack Query
- **Blockchain Integration**: viem, wagmi
- **Data Visualization**: recharts, visx
- **Validation**: zod
- **HTTP Client**: axios
- **Development**: ESLint, Prettier, Husky

## Getting Started Locally

### Prerequisites

- Node.js 22.14.0 (specified in `.nvmrc`)
- pnpm package manager

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd defi-panda-web
```

2. Install dependencies:

```bash
pnpm install
```

3. Start the development server:

```bash
pnpm run dev
```

4. Open your browser and navigate to the local development URL (typically `http://localhost:3000`)

## Available Scripts

| Script             | Description                             |
| ------------------ | --------------------------------------- |
| `npm run dev`      | Start the development server            |
| `npm run build`    | Build the application for production    |
| `npm run preview`  | Preview the production build locally    |
| `npm run astro`    | Run Astro CLI commands                  |
| `npm run lint`     | Run ESLint to check code quality        |
| `npm run lint:fix` | Run ESLint and automatically fix issues |
| `npm run format`   | Format code using Prettier              |

## Project Scope

### Included in MVP

- ✅ Vault tracking and monitoring for ERC4626 standard vaults
- ✅ Comprehensive vault directory with filtering and sorting
- ✅ Detailed analytics pages for individual vaults
- ✅ Data visualization through charts and tables
- ✅ Responsive web interface
- ✅ State persistence for user preferences

### Explicitly Excluded from MVP

- ❌ Transaction capabilities (no depositing, withdrawing, or execution)
- ❌ Vault management features (users cannot add vaults through interface)
- ❌ Backend development (APIs handled by separate infrastructure)
- ❌ Mobile application development
- ❌ User authentication and account management
- ❌ Data export functionality
- ❌ Wallet connection capabilities
- ❌ User-generated content management

### Technical Boundaries

- Web-only platform (no native mobile apps)
- Desktop-first responsive design approach
- No real-time data requirements
- No payment processing or financial transactions

## Project Status

**Version**: 0.0.1 (Early Development)

This project is currently in MVP development phase. The platform focuses on providing comprehensive
analytics and insights for ERC4626 vaults without transaction capabilities.

## License

License information not specified. Please contact the project maintainers for licensing details.

---

For questions, issues, or contributions, please refer to the project's issue tracker or contact the
development team.
