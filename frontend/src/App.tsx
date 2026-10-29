import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { queryClient } from './app/queryClient';
import { router } from './app/router';
import { ToastProvider } from './context/ToastContext';
import { RoleProvider } from './context/RoleContext';
import { AuthProvider } from './context/AuthContext';

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <RoleProvider>
          <AuthProvider>
            <RouterProvider router={router} />
          </AuthProvider>
        </RoleProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}

export default App;
