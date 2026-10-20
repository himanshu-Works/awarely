import { type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { LoadingScreen } from '@/components/ui/Spinner'
import type { UserRole } from '@/types/user'
import { Alert } from '@/components/design-system/Alert'
import { Button } from '@/components/design-system/Button'

interface ProtectedRouteProps {
  children: ReactNode
  allowedRoles?: UserRole[]
  allowGuest?: boolean
}

export function ProtectedRoute({
  children,
  allowedRoles,
  allowGuest = true,
}: ProtectedRouteProps) {
  const { user, role, authLoading, isGuest } = useAuth()
  const location = useLocation()

  if (authLoading) {
    return <LoadingScreen message="Verifying credentials…" />
  }

  // Not signed in
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // If guest is not allowed for this route
  if (!allowGuest && isGuest) {
    return <Navigate to="/login" replace />
  }

  // Role-Based Access Control (RBAC): check role permissions
  if (allowedRoles && !allowedRoles.includes(role)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--background)]">
        <div className="max-w-md w-full">
          <Alert
            type="concern"
            title="Access Restricted"
            description="You do not have administrative or developer permissions to access this feature."
            action={
              <Button
                variant="primary"
                size="sm"
                onClick={() => window.location.assign('/')}
              >
                Return to Awareness Map
              </Button>
            }
          />
        </div>
      </div>
    )
  }

  return <>{children}</>
}
