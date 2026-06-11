# Mantle UI/UX Guidelines

## Brand Identity
- **Primary Color**: Mantle Green (`#00FF8B`).
- **Background**: Deep Dark (`#0B0E11`) or WalletGenie Dark (`#121417`).
- **Typography**: Inter or similar clean sans-serif.
- **Vibe**: High-tech, Agentic, Financial, Modular.

## Technical Stack (Web Package)
- **Framework**: React 19 + Next.js 16 (App Router).
- **Styling**: TailwindCSS 4.
- **Components**: Shadcn/ui (Radix UI).
- **Icons**: Lucide React.
- **Charts**: Recharts.

## Best Practices
- **Neon Accents**: Use green/cyan glow for active states and "Success" indicators.
- **Glassmorphism**: Use `backdrop-blur` for overlays and cards.
- **Animations**: Subtle entry animations using `framer-motion` or CSS transitions.
- **Mobile First**: Ensure dashboard layouts stack correctly on small screens.
- **Status Indicators**: Clear visual feedback for blockchain transactions (Pending, Success, Error).

## Design Patterns
- **Treasury Cards**: Summary cards at the top for quick stats (Total Value, APY).
- **Action Cards**: Tool outputs rendered as actionable cards with "Execute" and "Cancel" buttons.
- **Chat Interface**: Floating or sidebar chat with streaming message support.
