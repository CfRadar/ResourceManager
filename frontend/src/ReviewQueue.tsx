import { useState } from "react"

type ReviewIcon = "arrowLeft" | "search" | "bell" | "calendar" | "clock" | "check" | "close" | "missing" | "shield" | "history" | "alert" | "document" | "download" | "override" | "message" | "wait" | "reject" | "approve"

type DialogAction = {
  label: string
  kind: "approve" | "info" | "waitlist" | "reject"
  documentId?: string
} | null

function Icon({ name, size = 18 }: { name: ReviewIcon; size?: number }) {
  const paths = {
    arrowLeft: <path d="M19 12H5m5-5-5 5 5 5" />,
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4.2-4.2" />
      </>
    ),
    bell: (
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M10 21h4" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    missing: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M9.8 9a2.4 2.4 0 1 1 3.6 2.1c-.9.5-1.4.9-1.4 2.1m0 3.3h.01" />
      </>
    ),
    shield: (
      <>
        <path d="M12 3 5 6v5c0 4.6 2.8 8.1 7 10 4.2-1.9 7-5.4 7-10V6l-7-3Z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
    history: (
      <>
        <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
        <path d="M3 3v5h5M12 7v5l3 2" />
      </>
    ),
    alert: (
      <>
        <path d="M12 3 2.8 20h18.4L12 3Z" />
        <path d="M12 9v5m0 3h.01" />
      </>
    ),
    document: (
      <>
        <path d="M6 3h8l4 4v14H6V3Z" />
        <path d="M14 3v5h5M9 13h6M9 17h5" />
      </>
    ),
    download: (
      <>
        <path d="M12 3v12m0 0 5-5m-5 5-5-5M5 21h14" />
      </>
    ),
    override: (
      <>
        <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
        <circle cx="16" cy="7" r="2" />
        <circle cx="8" cy="17" r="2" />
      </>
    ),
    message: (
      <>
        <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8Z" />
        <path d="M8 10h8M8 14h5" />
      </>
    ),
    wait: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    reject: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m9 9 6 6m0-6-6 6" />
      </>
    ),
    approve: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m8 12 3 3 5-6" />
      </>
    ),
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  )
}

const eligibilityRows = [
  {
    id: "membership",
    label: "Active institutional membership",
    detail: "Northbridge University · Staff Researcher",
    status: "pass",
    source: "SSO directory",
  },
  {
    id: "training",
    label: "SLS Operator Training L2",
    detail: "No completion record found",
    status: "fail",
    source: "Training registry",
  },
  {
    id: "safety",
    label: "Powder Handling Agreement",
    detail: "Document uploaded · signature not detected",
    status: "missing",
    source: "Document AI",
  },
  {
    id: "billing",
    label: "Valid billing profile",
    detail: "Engineering Research Group · 4102",
    status: "pass",
    source: "Finance system",
  },
  {
    id: "allocation",
    label: "Fair-use allocation",
    detail: "6 of 8 weekly hours after this booking",
    status: "pass",
    source: "Usage ledger",
  },
]

const initialDocuments = [
  {
    id: "risk",
    name: "Project_Risk_Assessment_v3.pdf",
    meta: "PDF · 1.8 MB · Uploaded 18 Jun, 09:42",
    description:
      "Risk assessment covering Nylon 12 powder handling, ventilation, and post-processing.",
    status: "pending",
  },
  {
    id: "safety",
    name: "Powder_Safety_Agreement.pdf",
    meta: "PDF · 640 KB · Uploaded 18 Jun, 09:44",
    description:
      "Facility safety agreement. Automated review could not confirm the signature field.",
    status: "pending",
  },
]

export default function ReviewQueue({
  onBack,
  onOpenCheckIn,
}: {
  onBack: () => void
  onOpenCheckIn: () => void
}) {
  const [overrides, setOverrides] = useState<string[]>([])
  const [documents, setDocuments] = useState(initialDocuments)
  const [dialogAction, setDialogAction] = useState<DialogAction>(null)
  const [reason, setReason] = useState("")
  const [decisionNotice, setDecisionNotice] = useState("")
  const [approved, setApproved] = useState(false)

  const openDialog = (
    label: string,
    kind: NonNullable<DialogAction>["kind"],
    documentId?: string,
  ) => {
    setReason("")
    setDialogAction({ label, kind, documentId })
  }

  const recordDecision = () => {
    if (!dialogAction || !reason.trim()) return

    if (dialogAction.documentId) {
      setDocuments((current) =>
        current.map((document) =>
          document.id === dialogAction.documentId
            ? {
                ...document,
                status:
                  dialogAction.kind === "approve" ? "approved" : "rejected",
              }
            : document,
        ),
      )
      setDecisionNotice(`${dialogAction.label} recorded with a review note.`)
    } else {
      setDecisionNotice(
        `${dialogAction.label} decision recorded for request #R-102.`,
      )
      if (dialogAction.kind === "approve") setApproved(true)
    }
    setDialogAction(null)
    setReason("")
  }

  return (
    <div className="review-shell">
      <header className="manager-header">
        <a
          className="manager-brand"
          href="#"
          aria-label="Common Ground manager"
        >
          <span className="manager-mark">
            <i />
            <i />
            <i />
          </span>
          <span>
            COMMON<strong>GROUND</strong>
          </span>
          <small>Facility manager</small>
        </a>
        <nav aria-label="Manager navigation">
          <a className="active" href="#">
            Review Queue <span>7</span>
          </a>
          <a href="#">Resources</a>
          <a href="#">Schedule</a>
        </nav>
        <label className="manager-search">
          <Icon name="search" size={16} />
          <input placeholder="Search requests" />
          <kbd>⌘ K</kbd>
        </label>
        <button className="manager-bell" aria-label="Notifications">
          <Icon name="bell" size={17} />
          <span />
        </button>
        <span className="manager-avatar">MR</span>
      </header>

      <main className="review-main">
        <div className="queue-breadcrumb">
          <button onClick={onBack}>
            <Icon name="arrowLeft" size={16} />
            Back to resource
          </button>
          <span>Queue position 1 of 7</span>
        </div>

        {decisionNotice && (
          <div className="decision-notice">
            <Icon name="check" size={15} />
            {decisionNotice}
            {approved && (
              <button className="open-checkin" onClick={onOpenCheckIn}>
                Open user check-in
              </button>
            )}
            <button
              onClick={() => setDecisionNotice("")}
              aria-label="Dismiss notification"
            >
              <Icon name="close" size={14} />
            </button>
          </div>
        )}

        <section className="request-summary">
          <div className="request-id-block">
            <span>Request</span>
            <strong>#R-102</strong>
          </div>
          <div className="request-resource">
            <p>Equipment access request</p>
            <h1>Formlabs Fuse 1+ 30W</h1>
            <span>Advanced Manufacturing Lab</span>
          </div>
          <div className="request-slot">
            <span className="summary-icon">
              <Icon name="calendar" size={18} />
            </span>
            <div>
              <small>Requested slot</small>
              <strong>Wed, 18 June · 14:00–16:00</strong>
              <span>Supervised access · 2 hours</span>
            </div>
          </div>
          <div className="status-block">
            <small>Current status</small>
            <span className="awaiting-status">
              <i />
              Awaiting Documents
            </span>
          </div>
        </section>

        <div className="review-layout">
          <div className="request-context">
            <section className="review-card requester-card">
              <div className="review-card-heading">
                <div>
                  <p>Requester background</p>
                  <h2>Alex Kim</h2>
                </div>
                <span className="verified-member">
                  <Icon name="shield" size={13} />
                  Verified member
                </span>
              </div>
              <div className="requester-profile">
                <span className="requester-avatar">AK</span>
                <div>
                  <strong>Staff Researcher</strong>
                  <span>Robotics & Autonomous Systems</span>
                  <small>Member since September 2022</small>
                </div>
                <button>View profile</button>
              </div>
              <div className="requester-stats">
                <div>
                  <span className="stat-icon green">
                    <Icon name="history" size={17} />
                  </span>
                  <strong>12</strong>
                  <span>Past facility bookings</span>
                </div>
                <div>
                  <span className="stat-icon green">
                    <Icon name="check" size={17} />
                  </span>
                  <strong>100%</strong>
                  <span>On-time return rate</span>
                </div>
                <div>
                  <span className="stat-icon neutral">
                    <Icon name="alert" size={17} />
                  </span>
                  <strong>0</strong>
                  <span>Recorded incidents</span>
                </div>
              </div>
              <div className="membership-note">
                <Icon name="check" size={14} />
                Membership verified through institutional SSO 4 minutes ago.
              </div>
            </section>

            <section className="review-card statement-card">
              <div className="review-card-heading">
                <div>
                  <p>Request details</p>
                  <h2>Purpose statement</h2>
                </div>
                <span className="word-count">112 words</span>
              </div>
              <blockquote>
                We are developing a lightweight robotic gripper for delicate
                sample handling. The Fuse 1+ will be used to produce three
                iterations of the finger linkage in Nylon 12. Each build has
                been checked against the machine volume and no unsupported
                experimental materials will be introduced.
              </blockquote>
              <div className="purpose-tags">
                <span>Robotics</span>
                <span>Prototype</span>
                <span>Nylon 12</span>
                <span>3 iterations</span>
              </div>
            </section>

            <section className="review-card materials-card">
              <div className="review-card-heading">
                <div>
                  <p>Planned use</p>
                  <h2>Materials &amp; process</h2>
                </div>
              </div>
              <dl>
                <div>
                  <dt>Material</dt>
                  <dd>Nylon 12 · facility stock</dd>
                </div>
                <div>
                  <dt>Estimated volume</dt>
                  <dd>460 cm³ across 3 parts</dd>
                </div>
                <div>
                  <dt>Post-processing</dt>
                  <dd>Depowdering and light bead blasting</dd>
                </div>
                <div>
                  <dt>Special conditions</dt>
                  <dd>None declared</dd>
                </div>
              </dl>
            </section>
          </div>

          <div className="review-evidence">
            <section className="review-card eligibility-matrix">
              <div className="review-card-heading">
                <div>
                  <p>Automated checks · Updated just now</p>
                  <h2>System eligibility results</h2>
                </div>
                <div className="matrix-score">
                  <span>3 / 5</span>
                  <small>checks passed</small>
                </div>
              </div>
              <div className="matrix-header">
                <span>Requirement</span>
                <span>Source</span>
                <span>Result</span>
                <span>Override</span>
              </div>
              <div className="matrix-rows">
                {eligibilityRows.map((row) => {
                  const overridden = overrides.includes(row.id)
                  return (
                    <div className="matrix-row" key={row.id}>
                      <div>
                        <strong>{row.label}</strong>
                        <span>{row.detail}</span>
                      </div>
                      <span className="matrix-source">{row.source}</span>
                      <span
                        className={`matrix-status ${
                          overridden ? "overridden" : row.status
                        }`}
                      >
                        <Icon
                          name={
                            overridden || row.status === "pass"
                              ? "check"
                              : row.status === "fail"
                                ? "close"
                                : "missing"
                          }
                          size={12}
                        />
                        {overridden ? "OVERRIDE" : row.status.toUpperCase()}
                      </span>
                      <button
                        className={
                          overridden
                            ? "override-button active"
                            : "override-button"
                        }
                        onClick={() =>
                          setOverrides((current) =>
                            current.includes(row.id)
                              ? current.filter((id) => id !== row.id)
                              : [...current, row.id],
                          )
                        }
                        disabled={row.status === "pass" && !overridden}
                        aria-label={`Override ${row.label}`}
                      >
                        <Icon name="override" size={14} />
                      </button>
                    </div>
                  )
                })}
              </div>
              {overrides.length > 0 && (
                <div className="override-warning">
                  <Icon name="alert" size={15} />
                  {overrides.length} system result overridden. A reason will be
                  required before approval.
                </div>
              )}
            </section>

            <section className="review-card document-panel">
              <div className="review-card-heading">
                <div>
                  <p>Individual file review</p>
                  <h2>Uploaded documents</h2>
                </div>
                <span className="document-count">2 PDFs</span>
              </div>
              <div className="document-list">
                {documents.map((document) => (
                  <article className="document-item" key={document.id}>
                    <span className="pdf-icon">
                      <Icon name="document" size={20} />
                      <small>PDF</small>
                    </span>
                    <div className="document-info">
                      <strong>{document.name}</strong>
                      <span>{document.meta}</span>
                      <p>{document.description}</p>
                    </div>
                    <button
                      className="download-document"
                      aria-label={`Download ${document.name}`}
                    >
                      <Icon name="download" size={16} />
                    </button>
                    {document.status === "pending" ? (
                      <div className="document-actions">
                        <button
                          className="approve-document"
                          onClick={() =>
                            openDialog(
                              "Approve document",
                              "approve",
                              document.id,
                            )
                          }
                        >
                          <Icon name="check" size={13} />
                          Approve
                        </button>
                        <button
                          className="reject-document"
                          onClick={() =>
                            openDialog("Reject document", "reject", document.id)
                          }
                        >
                          <Icon name="close" size={13} />
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className={`document-decision ${document.status}`}>
                        <Icon
                          name={
                            document.status === "approved" ? "check" : "close"
                          }
                          size={13}
                        />
                        {document.status}
                      </span>
                    )}
                  </article>
                ))}
              </div>
            </section>
          </div>
        </div>
      </main>

      <div className="decision-toolbar">
        <div>
          <span>Decision for request</span>
          <strong>#R-102 · Formlabs Fuse 1+ 30W</strong>
        </div>
        <p>Every action is recorded in the facility audit log.</p>
        <div className="decision-actions">
          <button
            className="request-info-action"
            onClick={() => openDialog("Request information", "info")}
          >
            <Icon name="message" size={15} />
            Request Info
          </button>
          <button
            className="waitlist-action"
            onClick={() => openDialog("Move to waitlist", "waitlist")}
          >
            <Icon name="wait" size={15} />
            Waitlist
          </button>
          <button
            className="reject-action"
            onClick={() => openDialog("Reject request", "reject")}
          >
            <Icon name="reject" size={15} />
            Reject
          </button>
          <button
            className="approve-action"
            onClick={() => openDialog("Approve request", "approve")}
          >
            <Icon name="approve" size={15} />
            Approve
          </button>
        </div>
      </div>

      {dialogAction && (
        <div className="reason-overlay" role="presentation">
          <section
            className="reason-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reason-title"
          >
            <div className={`reason-icon ${dialogAction.kind}`}>
              <Icon
                name={
                  dialogAction.kind === "approve"
                    ? "approve"
                    : dialogAction.kind === "reject"
                      ? "reject"
                      : dialogAction.kind === "waitlist"
                        ? "wait"
                        : "message"
                }
                size={21}
              />
            </div>
            <button
              className="reason-close"
              onClick={() => setDialogAction(null)}
              aria-label="Close reason dialog"
            >
              <Icon name="close" size={17} />
            </button>
            <p>Mandatory decision rationale</p>
            <h2 id="reason-title">{dialogAction.label}</h2>
            <span>
              Add a clear reason. This note will be added to the audit log
              {dialogAction.kind !== "approve" &&
                " and shared with the requester"}
              .
            </span>
            <label>
              <span>Reason for this action</span>
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Describe the evidence and reasoning behind your decision..."
                autoFocus
              />
              <small>{reason.length}/500</small>
            </label>
            <div className="reason-templates">
              <span>Quick reasons</span>
              <button
                onClick={() =>
                  setReason("Required documentation is incomplete or unsigned.")
                }
              >
                Incomplete documents
              </button>
              <button
                onClick={() =>
                  setReason(
                    "Required training must be completed before access.",
                  )
                }
              >
                Training required
              </button>
            </div>
            <div className="reason-footer">
              <button onClick={() => setDialogAction(null)}>Cancel</button>
              <button
                disabled={!reason.trim()}
                onClick={recordDecision}
                className={dialogAction.kind}
              >
                Confirm {dialogAction.label}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
