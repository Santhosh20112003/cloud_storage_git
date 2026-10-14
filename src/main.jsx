import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App.jsx'
import './index.css'
import { GithubProvider } from './context/GithubContext'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Do not retry client errors where retry will always fail
        const status = error?.response?.status;
        if (status && [400, 401, 403, 404, 422].includes(status)) return false;
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      refetchOnWindowFocus: false,
      staleTime: 1000 * 30, // 30 seconds
      gcTime: 1000 * 60 * 10, // 10 minutes garbage collection
    },
    mutations: {
      retry: (failureCount, error) => {
        const status = error?.response?.status;
        if (status && [400, 401, 404, 422].includes(status)) return false;
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    }
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <GithubProvider>
          <App />
        </GithubProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
)
