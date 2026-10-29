import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { AuthGuard } from './guards/AuthGuard';
import { RoleGuard } from './guards/RoleGuard';

import { LandingPage } from '../features/discovery/LandingPage';
import { DiscoverPage } from '../features/discovery/DiscoverPage';
import { ResourcesPage } from '../features/resources/ResourcesPage';
import { ResourceDetailPage } from '../features/resources/ResourceDetailPage';
import { RequestWizardPage } from '../features/requests/RequestWizardPage';
import { LoginPage } from '../features/auth/LoginPage';
import { RegisterPage } from '../features/auth/RegisterPage';
import { VerifyOtpPage } from '../features/auth/VerifyOtpPage';
import { MyDashboardPage } from '../features/requester/MyDashboardPage';
import { MyBookingsPage } from '../features/requester/MyBookingsPage';
import { RequestDetailPage } from '../features/requester/RequestDetailPage';
import { BookingDetailPage } from '../features/requester/BookingDetailPage';
import { ReviewQueuePage } from '../features/manage/ReviewQueuePage';
import { ManagerDashboardPage } from '../features/manage/ManagerDashboardPage';
import { CoordinatorDeskPage } from '../features/coordinate/CoordinatorDeskPage';
import { AdminDashboardPage } from '../features/admin/AdminDashboardPage';
import { NotFoundPage } from '../features/common/NotFoundPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      // Public Discovery & Catalog Routes
      { index: true, element: <LandingPage /> },
      { path: 'discover', element: <DiscoverPage /> },
      { path: 'resources', element: <ResourcesPage /> },
      { path: 'resources/:id', element: <ResourceDetailPage /> },
      {
        path: 'resources/:id/request',
        element: (
          <AuthGuard>
            <RequestWizardPage />
          </AuthGuard>
        ),
      },

      // Authentication Routes
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
      { path: 'verify-otp', element: <VerifyOtpPage /> },

      // Requester Workflows (Auth + Role Guard)
      {
        path: 'dashboard',
        element: (
          <AuthGuard>
            <RoleGuard allowedRoles={['REQUESTER']}>
              <MyDashboardPage />
            </RoleGuard>
          </AuthGuard>
        ),
      },
      {
        path: 'my-bookings',
        element: (
          <AuthGuard>
            <RoleGuard allowedRoles={['REQUESTER']}>
              <MyBookingsPage />
            </RoleGuard>
          </AuthGuard>
        ),
      },
      {
        path: 'requests/:id',
        element: (
          <AuthGuard>
            <RequestDetailPage />
          </AuthGuard>
        ),
      },
      {
        path: 'bookings/:id',
        element: (
          <AuthGuard>
            <BookingDetailPage />
          </AuthGuard>
        ),
      },

      // Facility Manager Workflows
      {
        path: 'manage/queue',
        element: (
          <AuthGuard>
            <RoleGuard allowedRoles={['MANAGER']}>
              <ReviewQueuePage />
            </RoleGuard>
          </AuthGuard>
        ),
      },
      {
        path: 'manage/dashboard',
        element: (
          <AuthGuard>
            <RoleGuard allowedRoles={['MANAGER']}>
              <ManagerDashboardPage />
            </RoleGuard>
          </AuthGuard>
        ),
      },

      // Institutional Coordinator Workflows
      {
        path: 'coordinate/desk',
        element: (
          <AuthGuard>
            <RoleGuard allowedRoles={['COORDINATOR']}>
              <CoordinatorDeskPage />
            </RoleGuard>
          </AuthGuard>
        ),
      },

      // Administrator Governance
      {
        path: 'admin/dashboard',
        element: (
          <AuthGuard>
            <RoleGuard allowedRoles={['ADMIN']}>
              <AdminDashboardPage />
            </RoleGuard>
          </AuthGuard>
        ),
      },

      // 404 Catch-All
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
