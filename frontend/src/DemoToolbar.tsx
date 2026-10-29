import { useState } from "react"

type DemoStage = "home" | "search" | "request" | "approve" | "checkin"

const roles = [
  {
    label: "Manager at Makerspace A",
    detail: "Facility manager",
    initials: "MA",
  },
  {
    label: "Student Requester",
    detail: "Equipment user",
    initials: "SR",
  },
  {
    label: "System Admin",
    detail: "Platform administrator",
    initials: "SA",
  },
]

const actions: { stage: DemoStage; label: string }[] = [
  { stage: "home", label: "Main Page" },
  { stage: "search", label: "Step 1: Search" },
  { stage: "request", label: "Step 2: Request" },
  { stage: "approve", label: "Step 3: Approve" },
  { stage: "checkin", label: "Step 4: Check-In" },
]

export default function DemoToolbar({
  activeStage,
  onJump,
}: {
  activeStage?: DemoStage
  onJump: (stage: DemoStage) => void
}) {
  const [role, setRole] = useState("Manager at Makerspace A")
  const [roleOpen, setRoleOpen] = useState(false)

  return (
    <aside className="demo-toolbar" aria-label="Judge preset demo toolbar">
      <div className="demo-label">
        <span aria-hidden="true">🎓</span>
        <strong>JUDGE PRESET</strong>
        <em>DEMO TOOLBAR</em>
      </div>

      <span className="demo-divider" />

      <div className="demo-role">
        <button
          className="demo-role-trigger"
          aria-expanded={roleOpen}
          onClick={() => setRoleOpen(!roleOpen)}
        >
          <span className="demo-role-avatar">
            {roles.find((item) => item.label === role)?.initials}
          </span>
          <span className="demo-role-copy">
            <small>Acting role</small>
            <strong>{role}</strong>
          </span>
          <svg
            className={roleOpen ? "open" : undefined}
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="m8 10 4 4 4-4" />
          </svg>
        </button>
        {roleOpen && (
          <div className="demo-role-menu">
            <span>Switch demo persona</span>
            {roles.map((item) => (
              <button
                key={item.label}
                className={role === item.label ? "selected" : undefined}
                onClick={() => {
                  setRole(item.label)
                  setRoleOpen(false)
                }}
              >
                <span>{item.initials}</span>
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.detail}</small>
                </span>
                {role === item.label && (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    aria-hidden="true"
                  >
                    <path d="m5 12 4 4L19 6" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="demo-actions">
        <span>Quick jump</span>
        {actions.map((action) => (
          <button
            key={action.stage}
            className={activeStage === action.stage ? "active" : undefined}
            onClick={() => onJump(action.stage)}
          >
            <span aria-hidden="true">
              {action.stage === "home" ? "⌂" : "⚡"}
            </span>
            {action.label}
          </button>
        ))}
      </div>

      <span className="demo-hint">Judge mode · seeded data</span>
    </aside>
  )
}
