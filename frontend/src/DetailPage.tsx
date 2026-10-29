import { useEffect, useState } from "react"

type IconName = "arrowLeft" | "search" | "bell" | "bookmark" | "share" | "map" | "check" | "close" | "alert" | "missing" | "lock" | "clock" | "calendar" | "document" | "shield" | "arrow" | "message" | "chevron"

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
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
    bookmark: (
      <path d="M6 4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21l-6-3.5L6 21Z" />
    ),
    share: (
      <>
        <circle cx="18" cy="5" r="2.5" />
        <circle cx="6" cy="12" r="2.5" />
        <circle cx="18" cy="19" r="2.5" />
        <path d="m8.2 10.8 7.6-4.5m-7.6 6.9 7.6 4.5" />
      </>
    ),
    map: (
      <>
        <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    close: <path d="m7 7 10 10M17 7 7 17" />,
    alert: (
      <>
        <path d="M12 3 2.8 20h18.4L12 3Z" />
        <path d="M12 9v5m0 3h.01" />
      </>
    ),
    missing: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M9.8 9a2.4 2.4 0 1 1 3.6 2.1c-.9.5-1.4.9-1.4 2.1m0 3.3h.01" />
      </>
    ),
    lock: (
      <>
        <rect x="5" y="10" width="14" height="11" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18" />
      </>
    ),
    document: (
      <>
        <path d="M6 3h8l4 4v14H6V3Z" />
        <path d="M14 3v5h5M9 13h6M9 17h5" />
      </>
    ),
    shield: (
      <>
        <path d="M12 3 5 6v5c0 4.6 2.8 8.1 7 10 4.2-1.9 7-5.4 7-10V6l-7-3Z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
    arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
    message: (
      <>
        <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8Z" />
        <path d="M8 10h8M8 14h5" />
      </>
    ),
    chevron: <path d="m8 10 4 4 4-4" />,
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

const images = [
  {
    src: "https://images.unsplash.com/photo-1642969164999-979483e21601?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=88&w=1400",
    alt: "Close view of additive manufacturing equipment",
  },
  {
    src: "https://images.unsplash.com/photo-1611117775350-ac3950990985?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=85&w=1000",
    alt: "Row of 3D printers in a fabrication workspace",
  },
  {
    src: "https://images.unsplash.com/photo-1606206873764-fd15e242df52?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=85&w=1000",
    alt: "Industrial robotic manufacturing equipment",
  },
]

const tabs = ["Overview", "Specs", "Access & Rules", "Availability", "History"]

const modes = [
  {
    name: "Independent",
    detail: "Use after induction",
    offered: true,
  },
  {
    name: "Supervised",
    detail: "Expert present",
    offered: true,
  },
  {
    name: "Service",
    detail: "Team runs your job",
    offered: true,
  },
  {
    name: "Collaboration",
    detail: "Not offered",
    offered: false,
  },
]

export default function DetailPage({
  onBack,
  onRequest,
}: {
  onBack: () => void
  onRequest: () => void
}) {
  const [activeImage, setActiveImage] = useState(0)
  const [galleryPaused, setGalleryPaused] = useState(false)
  const [galleryHovered, setGalleryHovered] = useState(false)
  const [activeTab, setActiveTab] = useState("Access & Rules")
  const [accessMode, setAccessMode] = useState("Supervised")
  const [saved, setSaved] = useState(false)
  const [trainingBooked, setTrainingBooked] = useState(false)
  const [documentSigned, setDocumentSigned] = useState(false)

  useEffect(() => {
    if (galleryPaused || galleryHovered) return
    const interval = window.setInterval(() => {
      setActiveImage((current) => (current + 1) % images.length)
    }, 4000)
    return () => window.clearInterval(interval)
  }, [galleryPaused, galleryHovered])

  return (
    <div className="detail-shell">
      <header className="detail-header">
        <a className="detail-brand" href="#" aria-label="Common Ground home">
          <span className="detail-mark">
            <i />
            <i />
            <i />
          </span>
          <span>
            COMMON<strong>GROUND</strong>
          </span>
        </a>
        <label className="detail-search">
          <Icon name="search" size={17} />
          <input placeholder="Search equipment and spaces" />
          <kbd>⌘ K</kbd>
        </label>
        <nav aria-label="Main navigation">
          <a href="#">Discover</a>
          <a href="#">My Requests</a>
        </nav>
        <button className="header-bell" aria-label="Notifications">
          <Icon name="bell" size={18} />
          <span />
        </button>
        <span className="detail-avatar">AK</span>
      </header>

      <main>
        <div className="breadcrumb-row">
          <button className="back-to-results" onClick={onBack}>
            <Icon name="arrowLeft" size={16} />
            Back to results
          </button>
          <span>Resource ID · EQ-3048</span>
        </div>

        <section className="resource-hero">
          <div
            className="gallery"
            onMouseEnter={() => setGalleryHovered(true)}
            onMouseLeave={() => setGalleryHovered(false)}
          >
            <div className="main-image">
              <img
                key={activeImage}
                src={images[activeImage].src}
                alt={images[activeImage].alt}
              />
              <span className="image-count">0{activeImage + 1} / 03</span>
              <button
                className="gallery-autoplay"
                onClick={() => setGalleryPaused(!galleryPaused)}
                aria-label={
                  galleryPaused
                    ? "Resume automatic image playback"
                    : "Pause automatic image playback"
                }
              >
                <i className={galleryPaused ? "paused" : undefined} />
                {galleryPaused
                  ? "Play"
                  : galleryHovered
                    ? "Hover pause"
                    : "Pause"}
              </button>
            </div>
            <div className="image-thumbnails">
              {images.map((image, index) => (
                <button
                  key={image.src}
                  className={activeImage === index ? "active" : undefined}
                  onClick={() => setActiveImage(index)}
                  aria-label={`View image ${index + 1}`}
                >
                  <img src={image.src} alt="" />
                </button>
              ))}
            </div>
          </div>

          <div className="resource-summary">
            <div className="summary-actions">
              <span className="category-tag">3D Printing</span>
              <div>
                <button
                  className={saved ? "saved" : undefined}
                  onClick={() => setSaved(!saved)}
                  aria-label="Save resource"
                >
                  <Icon name="bookmark" size={18} />
                </button>
                <button aria-label="Share resource">
                  <Icon name="share" size={18} />
                </button>
              </div>
            </div>
            <div>
              <p className="resource-code">Industrial additive manufacturing</p>
              <h1>Formlabs Fuse 1+ 30W</h1>
              <p className="resource-description">
                Production-ready selective laser sintering for strong,
                functional parts with fast turnaround and no support structures.
              </p>
            </div>
            <div className="facility-block">
              <span className="facility-icon">AM</span>
              <div>
                <small>Hosted by</small>
                <strong>Advanced Manufacturing Lab</strong>
                <span>
                  <Icon name="map" size={13} />
                  Northbridge University · 0.8 km
                </span>
              </div>
            </div>
            <div className="summary-metrics">
              <div>
                <span>Risk level</span>
                <strong className="risk-medium">
                  <i />
                  Medium
                </strong>
              </div>
              <div>
                <span>Cost model</span>
                <strong>Free · fair-use limits</strong>
              </div>
              <div>
                <span>Typical response</span>
                <strong>Within 1 working day</strong>
              </div>
            </div>
          </div>
        </section>

        <nav className="resource-tabs" aria-label="Resource sections">
          {tabs.map((tab) => (
            <button
              key={tab}
              className={activeTab === tab ? "active" : undefined}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
              {tab === "Access & Rules" && <span>3</span>}
            </button>
          ))}
        </nav>

        {activeTab === "Access & Rules" ? (
          <div className="detail-content">
            <div className="detail-primary">
              <section className="content-card access-card">
                <div className="card-heading">
                  <div>
                    <p className="section-kicker">Choose how to access</p>
                    <h2>Access mode</h2>
                    <span>
                      Requirements and pricing may change by access mode.
                    </span>
                  </div>
                  <span className="recommended-note">
                    Supervised recommended
                  </span>
                </div>
                <div className="mode-selector">
                  {modes.map((mode) => (
                    <button
                      key={mode.name}
                      disabled={!mode.offered}
                      className={
                        accessMode === mode.name ? "active" : undefined
                      }
                      onClick={() => setAccessMode(mode.name)}
                    >
                      <span className="mode-radio">
                        <i />
                      </span>
                      <span>
                        <strong>{mode.name}</strong>
                        <small>{mode.detail}</small>
                      </span>
                      {!mode.offered && <em>Not offered</em>}
                    </button>
                  ))}
                </div>
                <div className="selected-mode-note">
                  <Icon name="shield" size={18} />
                  <div>
                    <strong>{accessMode} access selected</strong>
                    <span>
                      A facility specialist will confirm your setup and safe
                      operating procedure before the session.
                    </span>
                  </div>
                </div>
              </section>

              <section className="content-card eligibility-card">
                <div className="card-heading">
                  <div>
                    <p className="section-kicker">Your qualification status</p>
                    <h2>Eligibility checklist</h2>
                    <span>3 of 5 requirements are currently complete.</span>
                  </div>
                  <div className="completion-ring">
                    <strong>60%</strong>
                    <span>complete</span>
                  </div>
                </div>

                <div className="requirement-list">
                  <div className="requirement-row">
                    <span className="status-icon pass">
                      <Icon name="check" size={14} />
                    </span>
                    <div>
                      <strong>Active institutional account</strong>
                      <span>Verified through Northbridge University SSO</span>
                    </div>
                    <span className="status-label pass">Pass</span>
                  </div>
                  <div className="requirement-row">
                    <span
                      className={`status-icon ${
                        trainingBooked ? "pending" : "fail"
                      }`}
                    >
                      <Icon
                        name={trainingBooked ? "clock" : "close"}
                        size={14}
                      />
                    </span>
                    <div>
                      <strong>SLS Operator Training L2</strong>
                      <span>
                        {trainingBooked
                          ? "Training request sent · awaiting confirmation"
                          : "Required for independent and supervised access"}
                      </span>
                    </div>
                    <button
                      className="inline-action"
                      onClick={() => setTrainingBooked(true)}
                    >
                      {trainingBooked ? "Requested" : "Book training"}
                      {!trainingBooked && <Icon name="arrow" size={14} />}
                    </button>
                  </div>
                  <div className="requirement-row">
                    <span
                      className={`status-icon ${
                        documentSigned ? "pass" : "missing"
                      }`}
                    >
                      <Icon
                        name={documentSigned ? "check" : "missing"}
                        size={14}
                      />
                    </span>
                    <div>
                      <strong>Powder Handling Safety Agreement</strong>
                      <span>
                        {documentSigned
                          ? "Signed today · valid for 12 months"
                          : "Read and sign the latest facility document"}
                      </span>
                    </div>
                    <button
                      className="inline-action"
                      onClick={() => setDocumentSigned(true)}
                    >
                      {documentSigned ? "Signed" : "Sign document"}
                      {!documentSigned && <Icon name="arrow" size={14} />}
                    </button>
                  </div>
                  <div className="requirement-row">
                    <span className="status-icon pass">
                      <Icon name="check" size={14} />
                    </span>
                    <div>
                      <strong>Research purpose provided</strong>
                      <span>Project “Lightweight robotic gripper” on file</span>
                    </div>
                    <span className="status-label pass">Pass</span>
                  </div>
                  <div className="requirement-row">
                    <span className="status-icon pass">
                      <Icon name="check" size={14} />
                    </span>
                    <div>
                      <strong>Billing profile</strong>
                      <span>Engineering Research Group · Cost centre 4102</span>
                    </div>
                    <span className="status-label pass">Pass</span>
                  </div>
                </div>
                <div className="eligibility-legend">
                  <span>
                    <i className="pass" /> Pass
                  </span>
                  <span>
                    <i className="fail" /> Fail
                  </span>
                  <span>
                    <i className="missing" /> Missing
                  </span>
                </div>
              </section>
            </div>

            <aside className="detail-secondary">
              <section className="content-card policy-card">
                <div className="card-heading">
                  <div>
                    <p className="section-kicker">Plain-language summary</p>
                    <h2>Policy at a glance</h2>
                  </div>
                  <button>View full policy</button>
                </div>
                <div className="policy-list">
                  <div>
                    <span>
                      <Icon name="shield" size={17} />
                    </span>
                    <div>
                      <strong>Training</strong>
                      <p>
                        Complete SLS Operator L2 before your first supervised or
                        independent session.
                      </p>
                    </div>
                  </div>
                  <div>
                    <span>
                      <Icon name="document" size={17} />
                    </span>
                    <div>
                      <strong>Required documents</strong>
                      <p>
                        Signed powder handling agreement and a current risk
                        assessment for new materials.
                      </p>
                    </div>
                  </div>
                  <div>
                    <span>
                      <Icon name="calendar" size={17} />
                    </span>
                    <div>
                      <strong>Cancellation window</strong>
                      <p>
                        Cancel at least 12 hours before your slot to protect
                        your fair-use allocation.
                      </p>
                    </div>
                  </div>
                  <div>
                    <span>
                      <Icon name="clock" size={17} />
                    </span>
                    <div>
                      <strong>Late return grace period</strong>
                      <p>
                        A 15-minute grace period applies. Repeated late finishes
                        may pause booking access.
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <section className="locked-card">
                <span className="lock-icon">
                  <Icon name="lock" size={21} />
                </span>
                <div>
                  <p className="section-kicker">Access instructions</p>
                  <h2>Visible after your booking is confirmed</h2>
                  <p>
                    Room entry details, equipment login, and emergency contacts
                    are protected for facility security.
                  </p>
                </div>
                <span className="locked-label">Locked</span>
              </section>

              <section className="owner-card">
                <span className="owner-avatar">MR</span>
                <div>
                  <small>Resource owner</small>
                  <strong>Dr. Maya Reyes</strong>
                  <span>Usually replies within 4 hours</span>
                </div>
                <button aria-label="Message resource owner">
                  <Icon name="message" size={17} />
                </button>
              </section>
            </aside>
          </div>
        ) : (
          <section className="tab-placeholder">
            <p className="section-kicker">{activeTab}</p>
            <h2>{activeTab} information</h2>
            <p>
              Detailed {activeTab.toLowerCase()} content for the Formlabs Fuse
              1+ 30W is available in this section.
            </p>
            {activeTab === "Specs" && (
              <dl className="spec-table">
                <div>
                  <dt>Build volume</dt>
                  <dd>165 × 165 × 320 mm</dd>
                </div>
                <div>
                  <dt>Layer thickness</dt>
                  <dd>110 μm</dd>
                </div>
                <div>
                  <dt>Materials</dt>
                  <dd>Nylon 12, Nylon 11, TPU 90A</dd>
                </div>
              </dl>
            )}
          </section>
        )}
      </main>

      <div className="sticky-actions">
        <div className="action-context">
          <span>Selected access mode</span>
          <strong>
            <i />
            {accessMode}
          </strong>
        </div>
        <div className="action-buttons">
          <button className="secondary-action">
            <Icon name="message" size={16} />
            Ask Owner
          </button>
          <button className="secondary-action">Join Waitlist</button>
          <button className="service-action">Request a Service</button>
          <button className="primary-action" onClick={onRequest}>
            Request Access
            <Icon name="arrow" size={17} />
          </button>
        </div>
      </div>
    </div>
  )
}
