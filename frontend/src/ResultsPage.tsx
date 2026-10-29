import { useMemo, useState } from "react"

type IconName = "search" | "bell" | "chevron" | "close" | "map" | "arrow" | "sliders" | "sparkles" | "check" | "calendar" | "bookmark"

type Resource = {
  id: number
  title: string
  facility: string
  institution: string
  distance: string
  mode: "Independent" | "Supervised" | "Service"
  match: "Available listing" | "AI suggestion"
  reasons?: string[]
  cost: string
  eligibility: "Ready to request" | "Training needed"
  category: string
  image: string
  alt: string
}

const resources: Resource[] = [
  {
    id: 1,
    title: "Formlabs Fuse 1+ 30W",
    facility: "Advanced Manufacturing Lab",
    institution: "Northbridge University",
    distance: "0.8 km",
    mode: "Independent",
    match: "Available listing",
    cost: "Free · fair-use limits",
    eligibility: "Ready to request",
    category: "3D Printing",
    image:
      "https://images.unsplash.com/photo-1599726159910-f4378e03f9bb?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=85&w=1100",
    alt: "Industrial additive manufacturing equipment",
  },
  {
    id: 2,
    title: "Weller WT 1010 Soldering Bench",
    facility: "Electronics Prototyping Studio",
    institution: "Central Institute of Technology",
    distance: "1.4 km",
    mode: "Supervised",
    match: "Available listing",
    cost: "£6 / hour",
    eligibility: "Training needed",
    category: "Electronics",
    image:
      "https://images.unsplash.com/photo-1775519520494-d12d91797a01?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=85&w=1100",
    alt: "Electronic equipment cabinets in an engineering laboratory",
  },
  {
    id: 3,
    title: "Ultimaker S7 Pro Bundle",
    facility: "Digital Fabrication Commons",
    institution: "Northbridge University",
    distance: "2.2 km",
    mode: "Independent",
    match: "AI suggestion",
    reasons: ["FDM process", "Large build volume"],
    cost: "Material cost only",
    eligibility: "Ready to request",
    category: "3D Printing",
    image:
      "https://images.unsplash.com/photo-1669344319217-19810a5e3d3b?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=85&w=1100",
    alt: "Precision equipment in a clean fabrication room",
  },
  {
    id: 4,
    title: "Keysight InfiniiVision Oscilloscope",
    facility: "Signals & Systems Laboratory",
    institution: "City Research College",
    distance: "3.6 km",
    mode: "Supervised",
    match: "AI suggestion",
    reasons: ["1 GHz bandwidth", "Electronics testing"],
    cost: "Free for academics",
    eligibility: "Training needed",
    category: "Test Equipment",
    image:
      "https://images.unsplash.com/photo-1767042286381-9587c6a7322a?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=85&w=1100",
    alt: "Technical measurement device with an analog dial",
  },
  {
    id: 5,
    title: "EOS P 396 SLS Printing Service",
    facility: "Industrial Additive Centre",
    institution: "Metro Innovation Campus",
    distance: "5.1 km",
    mode: "Service",
    match: "Available listing",
    cost: "Quote based",
    eligibility: "Ready to request",
    category: "3D Printing",
    image:
      "https://images.unsplash.com/photo-1778867127717-8e55e8e9dea4?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=85&w=1100",
    alt: "Laboratory with technical equipment and work tables",
  },
  {
    id: 6,
    title: "JBC Precision Rework Station",
    facility: "Hardware Systems Workshop",
    institution: "Northbridge University",
    distance: "0.5 km",
    mode: "Independent",
    match: "AI suggestion",
    reasons: ["Micro-soldering", "Rework capability"],
    cost: "£3 / hour",
    eligibility: "Training needed",
    category: "Electronics",
    image:
      "https://images.unsplash.com/photo-1786294111833-5568af2cb110?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=85&w=1100",
    alt: "Detailed electronics control panel",
  },
]

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const paths = {
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
    chevron: <path d="m8 10 4 4 4-4" />,
    close: <path d="m7 7 10 10M17 7 7 17" />,
    map: (
      <>
        <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    ),
    arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
    sliders: (
      <>
        <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
        <circle cx="16" cy="7" r="2" />
        <circle cx="8" cy="17" r="2" />
      </>
    ),
    sparkles: (
      <>
        <path d="m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2L12 3Z" />
        <path d="m18 14 .7 2.3L21 17l-2.3.7L18 20l-.7-2.3L15 17l2.3-.7L18 14Z" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18" />
      </>
    ),
    bookmark: (
      <path d="M6 4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21l-6-3.5L6 21Z" />
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

function FilterCheckbox({
  label,
  count,
  checked,
  onChange,
}: {
  label: string
  count?: number
  checked?: boolean
  onChange?: () => void
}) {
  return (
    <label className="filter-check">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className="check-box">
        <Icon name="check" size={11} />
      </span>
      <span>{label}</span>
      {count !== undefined && <small>{count}</small>}
    </label>
  )
}

function ResourceCard({
  resource,
  onViewDetails,
}: {
  resource: Resource
  onViewDetails: () => void
}) {
  const [saved, setSaved] = useState(false)
  return (
    <article className="result-card">
      <div className="result-image">
        <img src={resource.image} alt={resource.alt} />
        <span className={`mode-badge ${resource.mode.toLowerCase()}`}>
          {resource.mode}
        </span>
        <button
          className={saved ? "card-save saved" : "card-save"}
          onClick={() => setSaved(!saved)}
          aria-label={saved ? "Remove saved resource" : "Save resource"}
        >
          <Icon name="bookmark" size={17} />
        </button>
      </div>

      <div className="result-body">
        <div className="resource-heading">
          <span className="resource-category">{resource.category}</span>
          <h2>{resource.title}</h2>
          <p>{resource.facility}</p>
          <div className="institution-line">
            <span>{resource.institution}</span>
            <span>
              <Icon name="map" size={13} />
              {resource.distance}
            </span>
          </div>
        </div>

        <div
          className={
            resource.match === "AI suggestion"
              ? "match-panel ai-match"
              : "match-panel"
          }
        >
          <div className="match-title">
            {resource.match === "AI suggestion" ? (
              <Icon name="sparkles" size={14} />
            ) : (
              <span className="listing-dot" />
            )}
            <strong>{resource.match}</strong>
          </div>
          {resource.reasons && (
            <div className="reason-list">
              {resource.reasons.map((reason) => (
                <span key={reason}>{reason}</span>
              ))}
            </div>
          )}
        </div>

        <div className="card-meta">
          <div>
            <span>Cost model</span>
            <strong>{resource.cost}</strong>
          </div>
          <span
            className={`eligibility-preview ${
              resource.eligibility === "Ready to request" ? "ready" : "training"
            }`}
          >
            <i />
            {resource.eligibility}
          </span>
        </div>

        <button className="details-action" onClick={onViewDetails}>
          View Details
          <Icon name="arrow" size={16} />
        </button>
      </div>
    </article>
  )
}

export default function ResultsPage({
  onViewDetails,
}: {
  onViewDetails: () => void
}) {
  const [searchChips, setSearchChips] = useState([
    "3D Printer",
    "Soldering Station",
  ])
  const [eligibleOnly, setEligibleOnly] = useState(false)
  const [printingOnly, setPrintingOnly] = useState(false)
  const [distance, setDistance] = useState(10)

  const visibleResources = useMemo(
    () =>
      resources.filter(
        (resource) =>
          (!eligibleOnly || resource.eligibility === "Ready to request") &&
          (!printingOnly || resource.category === "3D Printing"),
      ),
    [eligibleOnly, printingOnly],
  )

  return (
    <div className="results-shell">
      <header className="results-header">
        <a className="result-brand" href="#" aria-label="Common Ground home">
          <span className="result-mark">
            <i />
            <i />
            <i />
          </span>
          <span>
            COMMON<strong>GROUND</strong>
          </span>
        </a>

        <label className="header-search">
          <Icon name="search" size={18} />
          <input
            defaultValue="3D printer and soldering station"
            aria-label="Search resources"
          />
          <kbd>⌘ K</kbd>
        </label>

        <nav aria-label="Main navigation">
          <a className="active" href="#">
            Discover
          </a>
          <a href="#">My Requests</a>
        </nav>

        <button className="bell-button" aria-label="Notifications">
          <Icon name="bell" size={18} />
          <span />
        </button>
        <span className="result-avatar">AK</span>
      </header>

      <div className="results-layout">
        <aside className="filter-sidebar">
          <div className="filter-heading">
            <div>
              <Icon name="sliders" size={18} />
              <strong>Filters</strong>
            </div>
            <button
              onClick={() => {
                setEligibleOnly(false)
                setPrintingOnly(false)
                setDistance(10)
              }}
            >
              Reset
            </button>
          </div>

          <section className="filter-section">
            <h3>Category</h3>
            <FilterCheckbox
              label="3D Printing"
              count={3}
              checked={printingOnly}
              onChange={() => setPrintingOnly(!printingOnly)}
            />
            <FilterCheckbox label="Electronics" count={2} />
            <FilterCheckbox label="Test Equipment" count={1} />
            <FilterCheckbox label="Machine Tools" count={8} />
          </section>

          <section className="filter-section">
            <h3>Institution</h3>
            <FilterCheckbox label="Northbridge University" count={3} />
            <FilterCheckbox label="Central Institute" count={1} />
            <FilterCheckbox label="City Research College" count={1} />
            <FilterCheckbox label="Metro Innovation Campus" count={1} />
          </section>

          <section className="filter-section">
            <h3>Access mode</h3>
            <FilterCheckbox label="Independent" count={3} />
            <FilterCheckbox label="Supervised" count={2} />
            <FilterCheckbox label="Service" count={1} />
          </section>

          <section className="filter-section">
            <h3>Date range</h3>
            <button className="date-filter">
              <Icon name="calendar" size={15} />
              <span>Any date</span>
              <Icon name="chevron" size={13} />
            </button>
          </section>

          <section className="filter-section">
            <div className="filter-label-row">
              <h3>Max cost</h3>
              <span>£50 / hr</span>
            </div>
            <input
              className="range-control"
              type="range"
              min="0"
              max="100"
              defaultValue="50"
              aria-label="Maximum hourly cost"
            />
            <div className="range-labels">
              <span>Free</span>
              <span>£100+</span>
            </div>
          </section>

          <section className="filter-section">
            <div className="filter-label-row">
              <h3>Distance</h3>
              <span>{distance} km</span>
            </div>
            <input
              className="range-control"
              type="range"
              min="1"
              max="25"
              value={distance}
              onChange={(event) => setDistance(Number(event.target.value))}
              aria-label="Maximum distance"
            />
            <div className="range-labels">
              <span>1 km</span>
              <span>25 km</span>
            </div>
          </section>

          <label className="eligibility-toggle">
            <input
              type="checkbox"
              checked={eligibleOnly}
              onChange={() => setEligibleOnly(!eligibleOnly)}
            />
            <span className="toggle-track">
              <i />
            </span>
            <span>Only show resources I am eligible to request</span>
          </label>
        </aside>

        <main className="results-main">
          <div className="need-summary">
            <div className="summary-label">
              <Icon name="sparkles" size={16} />
              <span>We parsed your need as</span>
            </div>
            <div className="parsed-chips">
              {searchChips.map((chip) => (
                <span key={chip}>
                  {chip}
                  <button
                    onClick={() =>
                      setSearchChips((current) =>
                        current.filter((item) => item !== chip),
                      )
                    }
                    aria-label={`Remove ${chip}`}
                  >
                    <Icon name="close" size={13} />
                  </button>
                </span>
              ))}
              <button className="add-need">+ Add need</button>
            </div>
            <button className="edit-search">Edit search</button>
          </div>

          <div className="results-titlebar">
            <div>
              <p className="results-kicker">Institutional network</p>
              <h1>{visibleResources.length} matching resources</h1>
              <span>Available across 4 institutions · Updated moments ago</span>
            </div>
            <label className="sort-control">
              <span>Sort by</span>
              <select defaultValue="Best match">
                <option>Best match</option>
                <option>Nearest first</option>
                <option>Lowest cost</option>
                <option>Soonest available</option>
              </select>
              <Icon name="chevron" size={13} />
            </label>
          </div>

          {visibleResources.length > 0 ? (
            <div className="resource-results-grid">
              {visibleResources.map((resource) => (
                <ResourceCard
                  key={resource.id}
                  resource={resource}
                  onViewDetails={onViewDetails}
                />
              ))}
            </div>
          ) : (
            <div className="no-results">
              <Icon name="search" size={26} />
              <h2>No eligible resources found</h2>
              <p>
                Try turning off the eligibility filter or broadening your
                search.
              </p>
              <button onClick={() => setEligibleOnly(false)}>
                Show all resources
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
