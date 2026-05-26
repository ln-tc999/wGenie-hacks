import type { Decorator } from '@storybook/react';
import { AppProviders } from '@/app/app-providers';

/**
 * Storybook decorator that wraps components with AppProviders
 * This provides React Query and Wagmi context for components that need them
 */
export const withAppProviders: Decorator = (Story) => {
  return (
    <AppProviders>
      <Story />
    </AppProviders>
  );
};
