import React, { createContext, useContext, useState, useEffect } from 'react';
import type { UserRole } from '../api/auth.api';

interface RoleContextValue {
  currentRole: UserRole;
  setRole: (role: UserRole) => void;
  availableRoles: UserRole[];
}

const RoleContext = createContext<RoleContextValue | undefined>(undefined);

const ALL_ROLES: UserRole[] = [
  'REQUESTER',
  'MANAGER',
  'COORDINATOR',
  'ADMIN',
  'COMMUNITY_PARTNER',
];

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [currentRole, setCurrentRole] = useState<UserRole>(() => {
    const saved = localStorage.getItem('simulatedRole');
    if (saved && ALL_ROLES.includes(saved as UserRole)) {
      return saved as UserRole;
    }
    return 'REQUESTER';
  });

  const setRole = (role: UserRole) => {
    setCurrentRole(role);
    localStorage.setItem('simulatedRole', role);
  };

  useEffect(() => {
    localStorage.setItem('simulatedRole', currentRole);
  }, [currentRole]);

  return (
    <RoleContext.Provider
      value={{
        currentRole,
        setRole,
        availableRoles: ALL_ROLES,
      }}
    >
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
}
