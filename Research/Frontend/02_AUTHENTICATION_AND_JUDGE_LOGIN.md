# Step 02: Authentication & The Judge Quick Login Panel

This guide details the authentication screens, demo OTP verification, and the floating **Judge Quick Login** toolbar for rapid role testing.

---

## 1. Auth Flow Architecture

```
[Register Form] ──> [Demo OTP Screen] ──> [Auto-Login & Profile]
                                                 ▲
                                                 │
[Login Form] ────────────────────────────────────┘
       ▲
       │ (1-Click)
[Judge Quick Login Bar]
```

---

## 2. Screens

### 2.1 Registration Page (`/register`)
- Input fields: Full Name, Institutional Email, Password, Affiliation description.
- Submitting triggers `POST /api/v1/auth/register`, which generates a demo OTP.
- Redirects to `/verify-otp?email=...`.

### 2.2 Virtual OTP Verification (`/verify-otp`)
- Displays 6-digit numeric input boxes.
- **Judge / Demo Transparency Banner:**
  > *"Demo Mode: Your verification code is automatically retrieved below:"*
  > **`123456`** [Click to auto-fill]
- Prevents evaluators or testers from getting blocked on email delivery stubs.

### 2.3 Login Page (`/login`)
- Clean email/password inputs with validation via `react-hook-form` + `zod`.
- Captures `?next=/resources/res_123/request` query parameter to redirect the user back to their intended action post-login.

---

## 3. The Judge Quick Login Floating Panel (`components/layout/JudgeQuickLogin.tsx`)

Section 5.16 & Section 16 mandate a 1-click role switcher toolbar pinned to the bottom or header during demonstration mode:

```tsx
export function JudgeQuickLogin() {
  const { loginWithRole } = useAuth();

  const demoAccounts = [
    { role: 'REQUESTER', label: 'Student / Requester', email: 'student@demo.edu' },
    { role: 'MANAGER', label: 'Facility Manager', email: 'manager@demo.edu' },
    { role: 'OPERATOR', label: 'Lab Operator', email: 'operator@demo.edu' },
    { role: 'COORDINATOR', label: 'Network Coordinator', email: 'coordinator@demo.edu' },
    { role: 'ADMIN', label: 'Institution Admin', email: 'admin@demo.edu' },
  ];

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 backdrop-blur-md text-white px-4 py-2.5 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3">
      <div className="flex items-center gap-1.5 text-xs text-amber-400 font-bold uppercase tracking-wider">
        <Sparkles className="w-3.5 h-3.5" />
        <span>Judge Quick Login:</span>
      </div>
      <div className="flex items-center gap-1.5">
        {demoAccounts.map((acc) => (
          <button
            key={acc.role}
            onClick={() => loginWithRole(acc.email)}
            className="text-xs px-2.5 py-1 bg-slate-800 hover:bg-blue-600 rounded-lg transition-colors font-medium border border-slate-700"
          >
            {acc.role}
          </button>
        ))}
      </div>
    </div>
  );
}
```

---

## 4. Implementation Checklist

- [ ] Implement `RegisterPage.tsx`, `LoginPage.tsx`, and `VerifyOtpPage.tsx`.
- [ ] Connect `JudgeQuickLogin` with pre-seeded demo accounts.
- [ ] Ensure auth state synchronizes with `localStorage` and `AuthContext`.
