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
import { CheckInPage } from '../features/checkin/CheckInPage';
import { CheckOutPage } from '../features/checkin/CheckOutPage';
import { ReviewQueuePage } from '../features/manage/ReviewQueuePage';
import { ReviewDetailPage } from '../features/manage/ReviewDetailPage';
import { ManagerDashboardPage } from '../features/manage/ManagerDashboardPage';
import { CheckInDeskPage } from '../features/manage/CheckInDeskPage';
import { CoordinatorDeskPage } from '../features/coordinate/CoordinatorDeskPage';
import { ServiceTrackingPage } from '../features/services/ServiceTrackingPage';
import { MissingResourceNeedPage } from '../features/needs/MissingResourceNeedPage';
import { IncidentReportPage } from '../features/incidents/IncidentReportPage';
import { ManagerIncidentDossierPage } from '../features/incidents/ManagerIncidentDossierPage';
import { TransactionHistoryPage } from '../features/history/TransactionHistoryPage';
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
      {
        path: 'bookings/:id/checkin',
        element: (
          <AuthGuard>
            <CheckInPage />
          </AuthGuard>
        ),
      },
      {
        path: 'bookings/:id/checkout',
        element: (
          <AuthGuard>
            <CheckOutPage />
          </AuthGuard>
        ),
      },
      {
        path: 'need',
        element: (
          <AuthGuard>
            <MissingResourceNeedPage />
          </AuthGuard>
        ),
      },
      {
        path: 'needs/new',
        element: (
          <AuthGuard>
            <MissingResourceNeedPage />
          </AuthGuard>
        ),
      },
      {
        path: 'services/:id',
        element: (
          <AuthGuard>
            <ServiceTrackingPage />
          </AuthGuard>
        ),
      },
      {
        path: 'me/services/:id',
        element: (
          <AuthGuard>
            <ServiceTrackingPage />
          </AuthGuard>
        ),
      },

      // Facility Manager Workflows
      {
        path: 'manage/dashboard',
        element: (
          <AuthGuard>
            <RoleGuard allowedRoles={['MANAGER', 'ADMIN']}>
              <ManagerDashboardPage />
            </RoleGuard>
          </AuthGuard>
        ),
      },
      {
        path: 'manage/queue',
        element: (
          <AuthGuard>
            <RoleGuard allowedRoles={['MANAGER', 'ADMIN']}>
              <ReviewQueuePage />
            </RoleGuard>
          </AuthGuard>
        ),
      },
      {
        path: 'manage/queue/:id',
        element: (
          <AuthGuard>
            <RoleGuard allowedRoles={['MANAGER', 'ADMIN']}>
              <ReviewDetailPage />
            </RoleGuard>
          </AuthGuard>
        ),
      },
      {
        path: 'manage/checkin',
        element: (
          <AuthGuard>
            <RoleGuard allowedRoles={['MANAGER', 'ADMIN']}>
              <CheckInDeskPage />
            </RoleGuard>
          </AuthGuard>
        ),
      },

      // Institutional Coordinator Workflows
      {
        path: 'coordinate',
        element: (
          <AuthGuard>
            <RoleGuard allowedRoles={['COORDINATOR', 'ADMIN']}>
              <CoordinatorDeskPage />
            </RoleGuard>
          </AuthGuard>
        ),
      },
      {
        path: 'coordinate/desk',
        element: (
          <AuthGuard>
            <RoleGuard allowedRoles={['COORDINATOR', 'ADMIN']}>
              <CoordinatorDeskPage />
            </RoleGuard>
          </AuthGuard>
        ),
      },

      // Incident Filing & Management Workflows
      {
        path: 'incidents/new',
        element: (
          <AuthGuard>
            <IncidentReportPage />
          </AuthGuard>
        ),
      },
      {
        path: 'me/incidents/new',
        element: (
          <AuthGuard>
            <IncidentReportPage />
          </AuthGuard>
        ),
      },
      {
        path: 'incidents/:id',
        element: (
          <AuthGuard>
            <ManagerIncidentDossierPage />
          </AuthGuard>
        ),
      },
      {
        path: 'manage/incidents/:id',
        element: (
          <AuthGuard>
            <RoleGuard allowedRoles={['MANAGER', 'ADMIN']}>
              <ManagerIncidentDossierPage />
            </RoleGuard>
          </AuthGuard>
        ),
      },

      // Universal Immutable Transaction History Receipt
      {
        path: 'history/:type/:id',
        element: (
          <AuthGuard>
            <TransactionHistoryPage />
          </AuthGuard>
        ),
      },

      // Administrator Governance
      {
        path: 'admin',
        element: (
          <AuthGuard>
            <RoleGuard allowedRoles={['ADMIN']}>
              <AdminDashboardPage />
            </RoleGuard>
          </AuthGuard>
        ),
      },
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
      {
        path: 'admin/audit',
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
