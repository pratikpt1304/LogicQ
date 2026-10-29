import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Prevents sudden flood of network requests on tab switch
      staleTime: 30000, // 30-second cache
      retry: (failureCount, error: any) => {
        // Never retry if unauthenticated, forbidden, or resource not found
        if (
          error?.status === 401 ||
          error?.status === 403 ||
          error?.status === 404 ||
          error?.code === 'SESSION_EXPIRED'
        ) {
          return false;
        }
        return failureCount < 1;
      },
    },
  },
});
