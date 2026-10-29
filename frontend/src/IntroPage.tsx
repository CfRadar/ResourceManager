import { useEffect, useState } from "react"

type IconName = "search" | "bell" | "chevron" | "arrow" | "shield" | "send" | "check" | "history" | "grid"

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
    arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
    shield: (
      <>
        <path d="M12 3 5 6v5c0 4.6 2.8 8.1 7 10 4.2-1.9 7-5.4 7-10V6l-7-3Z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
    send: <path d="m4 4 16 8-16 8 3-8-3-8Zm3 8h13" />,
    check: <path d="m5 12 4 4L19 6" />,
    history: (
      <>
        <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
        <path d="M3 3v5h5M12 7v5l3 2" />
      </>
    ),
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
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

const steps: { title: string; detail: string; icon: IconName }[] = [
  {
    title: "Find",
    detail: "Search across connected facilities",
    icon: "search",
  },
  {
    title: "Check Eligibility",
    detail: "See training and access requirements",
    icon: "shield",
  },
  {
    title: "Request",
    detail: "Choose a slot and share your purpose",
    icon: "send",
  },
  {
    title: "Use Responsibly",
    detail: "Follow facility and fair-use guidance",
    icon: "check",
  },
  {
    title: "Return & History",
    detail: "Close the loop and track your usage",
    icon: "history",
  },
]

const heroSlides = [
  {
    image:
      "https://images.unsplash.com/photo-1602052577122-f73b9710adba?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=88&w=1200",
    alt: "Bright university laboratory with analytical equipment",
    label: "Featured facility",
    title: "Life Sciences Imaging Core",
    detail: "North Campus · 8 resources open",
  },
  {
    image:
      "https://images.unsplash.com/photo-1775519520494-d12d91797a01?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=88&w=1200",
    alt: "Electronic engineering equipment in a university laboratory",
    label: "Engineering network",
    title: "Advanced Engineering Lab",
    detail: "Central Campus · Open today",
  },
  {
    image:
      "https://images.unsplash.com/photo-1766297247924-6638d54e7c89?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=88&w=1200",
    alt: "Researchers working together in a modern laboratory",
    label: "Collaborative space",
    title: "Digital Research Commons",
    detail: "West Campus · 12 desks available",
  },
  {
    image:
      "https://images.unsplash.com/photo-1562411053-1d8bdfe771c1?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=88&w=1200",
    alt: "Specialist scientific instrument in a research facility",
    label: "Specialist equipment",
    title: "Materials Analysis Suite",
    detail: "Science Quarter · Verified access",
  },
]

export default function IntroPage({ onDiscover }: { onDiscover: () => void }) {
  const [notifications, setNotifications] = useState(false)
  const [activeSlide, setActiveSlide] = useState(0)
  const [slidesPaused, setSlidesPaused] = useState(false)
  const [slidesHovered, setSlidesHovered] = useState(false)

  useEffect(() => {
    if (slidesPaused || slidesHovered) return
    const interval = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % heroSlides.length)
    }, 4200)
    return () => window.clearInterval(interval)
  }, [slidesPaused, slidesHovered])

  return (
    <div className="intro-shell">
      <header className="intro-header">
        <a className="intro-brand" href="#" aria-label="Common Ground home">
          <span className="intro-logo">
            <i />
            <i />
            <i />
          </span>
          <span>
            COMMON<strong>GROUND</strong>
          </span>
          <small>Resource network</small>
        </a>
        <nav aria-label="Main navigation">
          <button className="active" onClick={onDiscover}>
            Discover
          </button>
          <button onClick={onDiscover}>My Requests</button>
        </nav>
        <div className="intro-account">
          <div className="intro-notifications">
            <button
              onClick={() => setNotifications(!notifications)}
              aria-label="Notifications"
            >
              <Icon name="bell" />
              <span>2</span>
            </button>
            {notifications && (
              <div>
                <strong>Notifications</strong>
                <p>Your microscopy request was approved.</p>
                <p>Laser Safety L2 expires in 30 days.</p>
              </div>
            )}
          </div>
          <label className="intro-role">
            <span>Acting as</span>
            <strong>Researcher</strong>
            <select aria-label="Acting role">
              <option>Researcher</option>
              <option>Facility manager</option>
              <option>Student</option>
            </select>
            <Icon name="chevron" size={13} />
          </label>
          <span className="intro-avatar">AK</span>
        </div>
      </header>

      <main>
        <section className="intro-hero">
          <div className="intro-hero-grid">
            <div className="intro-hero-copy">
              <p>
                <i /> 142 shared resources · 24 locations
              </p>
              <h1>
                Find equipment and spaces you can <em>safely use.</em>
              </h1>
              <span>
                One trusted network for discovering, qualifying, and requesting
                access to institutional resources.
              </span>
              <div className="intro-hero-stats">
                <div>
                  <strong>142</strong>
                  <small>Shared resources</small>
                </div>
                <div>
                  <strong>38</strong>
                  <small>Available today</small>
                </div>
                <div>
                  <strong>24</strong>
                  <small>Connected sites</small>
                </div>
              </div>
            </div>
            <aside
              className={`intro-image ${
                slidesPaused || slidesHovered ? "paused" : ""
              }`}
              onMouseEnter={() => setSlidesHovered(true)}
              onMouseLeave={() => setSlidesHovered(false)}
            >
              <img
                key={activeSlide}
                src={heroSlides[activeSlide].image}
                alt={heroSlides[activeSlide].alt}
              />
              <div>
                <small>{heroSlides[activeSlide].label}</small>
                <strong>{heroSlides[activeSlide].title}</strong>
                <span>{heroSlides[activeSlide].detail}</span>
              </div>
              <span className="intro-slide-count">
                0{activeSlide + 1} / 0{heroSlides.length}
              </span>
              <span
                key={`progress-${activeSlide}`}
                className="intro-slide-progress"
              />
              <div className="intro-slide-controls">
                {heroSlides.map((slide, index) => (
                  <button
                    key={slide.title}
                    className={activeSlide === index ? "active" : undefined}
                    onClick={() => setActiveSlide(index)}
                    aria-label={`Show ${slide.title}`}
                  />
                ))}
                <button
                  className="intro-slide-pause"
                  onClick={() => setSlidesPaused(!slidesPaused)}
                >
                  {slidesPaused
                    ? "Play"
                    : slidesHovered
                      ? "Hover paused"
                      : "Pause"}
                </button>
              </div>
            </aside>
          </div>

          <div className="intro-entry">
            <div>
              <span>Ready to begin?</span>
              <strong>Explore the institutional resource network</strong>
            </div>
            <button onClick={onDiscover}>
              Explore Resources
              <Icon name="arrow" size={19} />
            </button>
          </div>
        </section>

        <section className="intro-how">
          <div className="intro-how-heading">
            <div>
              <p>Simple by design</p>
              <h2>From discovery to responsible use.</h2>
            </div>
            <span>
              Clear requirements and transparent steps help everyone access
              shared resources with confidence.
            </span>
          </div>
          <div className="intro-steps">
            {steps.map((step, index) => (
              <article
                key={step.title}
                className={index === 0 ? "clickable" : undefined}
                role={index === 0 ? "button" : undefined}
                tabIndex={index === 0 ? 0 : undefined}
                onClick={index === 0 ? onDiscover : undefined}
                onKeyDown={(event) => {
                  if (
                    index === 0 &&
                    (event.key === "Enter" || event.key === " ")
                  ) {
                    onDiscover()
                  }
                }}
              >
                <div>
                  <span>
                    <Icon name={step.icon} />
                  </span>
                  <em>0{index + 1}</em>
                </div>
                <h3>{step.title}</h3>
                <p>{step.detail}</p>
                {index < steps.length - 1 && (
                  <i>
                    <Icon name="arrow" size={14} />
                  </i>
                )}
              </article>
            ))}
          </div>
        </section>

        <section className="intro-callout">
          <span>
            <Icon name="grid" size={22} />
          </span>
          <div>
            <small>Missing something?</small>
            <h2>Can&apos;t find what you need?</h2>
            <p>
              Tell the network what would move your research forward. We&apos;ll
              help locate it or understand the demand.
            </p>
          </div>
          <a href="#missing-resource-form">
            Tell us what you need <Icon name="arrow" />
          </a>
        </section>
      </main>
      <footer className="intro-footer">
        <span>Common Ground · Institutional Resource Network</span>
        <span>Access responsibly. Share fairly.</span>
      </footer>
    </div>
  )
}
