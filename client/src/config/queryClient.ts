import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true, // Auto-sync immediately when switching tabs
      staleTime: 5000,
      retry: 1,
    },
  },
});
