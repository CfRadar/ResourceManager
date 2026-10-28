# Step 00: Architecture, Routing, State Management & Role Switcher

This guide details the React 19 + TypeScript frontend application architecture, routing layout, server-state management with TanStack Query, authentication providers, and the top-bar Role Switcher.

---

## 1. Directory Structure (`frontend/src/`)

```
frontend/src/
├── main.tsx                  # App entrypoint
├── App.tsx                   # Root component with Providers
├── index.css                 # Design tokens, typography, Tailwind utilities
├── app/
│   ├── router.tsx            # React Router route definitions
│   ├── queryClient.ts        # TanStack Query client configuration
│   └── guards/               # AuthGuard, RoleGuard, PublicOnlyGuard
├── api/
│   ├── client.ts             # Axios instance (/api/v1) with token interceptors
│   ├── auth.api.ts
│   ├── resources.api.ts
│   ├── bookings.api.ts
│   └── manage.api.ts
├── context/
│   ├── AuthContext.tsx       # Auth state, login/logout, current user
│   ├── RoleContext.tsx       # Active simulated role switcher state
│   └── ToastContext.tsx      # Global toast notification queue
├── components/               # Reusable UI primitives (Section 3)
│   ├── layout/               # Header, Footer, Sidebar, DemoBanner, RoleSwitcher
│   ├── feedback/             # StatusBadge, StatusTimeline, ReasonDialog
│   └── form/                 # Input, Select, SignaturePad, SlotPicker
├── features/                 # Page modules matching Section 4 route map
│   ├── discovery/            # LandingPage, DiscoverPage
│   ├── resources/            # ResourceDetailPage, RequestWizard
│   ├── requester/            # MyDashboard, MyRequests, MyBookings, CheckInPage
│   ├── manage/               # ManagerDashboard, ReviewQueue, CheckInDesk
│   ├── coordinate/           # CoordinatorDesk, ReferralInbox
│   └── admin/                # AdminDashboard, MemberManagement
└── hooks/
    ├── useAuth.ts
    ├── useRole.ts
    └── useToast.ts
```

---

## 2. Axios Client & Token Interceptors (`api/client.ts`)

Configures automatic Bearer token injection and refresh token rotation on `401 UNAUTHENTICATED`:

```typescript
import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1',
  withCredentials: true // Transmits httpOnly refresh cookies
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const { data } = await axios.post(
          'http://localhost:5000/api/v1/auth/refresh',
          {},
          { withCredentials: true }
        );
        localStorage.setItem('accessToken', data.data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.data.accessToken}`;
        return api(originalRequest);
      } catch (refreshErr) {
        localStorage.removeItem('accessToken');
        window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
      }
    }
    return Promise.reject(error);
  }
);
```

---

## 3. Router Guards & The Global Role Switcher (`RoleSwitcher.tsx`)

Section 2 mandates a role switcher for multi-role users and evaluators:

```tsx
export function RoleSwitcher() {
  const { currentRole, setRole, availableRoles } = useRole();

  return (
    <div className="flex items-center gap-2 bg-slate-800 text-white text-xs px-3 py-1.5 rounded-full border border-slate-700">
      <span className="text-slate-400">Acting as:</span>
      <select
        value={currentRole}
        onChange={(e) => setRole(e.target.value as any)}
        className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
      >
        {availableRoles.map((r) => (
          <option key={r} value={r} className="bg-slate-900 text-white">
            {r.charAt(0) + r.slice(1).toLowerCase()}
          </option>
        ))}
      </select>
    </div>
  );
}
```

---

## 4. Implementation Checklist

- [ ] Install packages: `npm i react-router-dom @tanstack/react-query axios lucide-react clsx tailwind-merge`.
- [ ] Configure `queryClient.ts` with default stale-time of 30 seconds.
- [ ] Implement `RoleGuard` returning an accessible "Access Restricted" screen rather than an empty page.
