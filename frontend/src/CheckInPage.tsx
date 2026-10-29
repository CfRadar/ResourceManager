import {
  ChangeEvent,
  DragEvent,
  PointerEvent,
  useEffect,
  useRef,
  useState,
} from "react"

type CheckIcon = "arrowLeft" | "check" | "shield" | "clock" | "user" | "clipboard" | "signature" | "location" | "camera" | "upload" | "close" | "refresh" | "arrow" | "lock"

function Icon({ name, size = 18 }: { name: CheckIcon; size?: number }) {
  const paths = {
    arrowLeft: <path d="M19 12H5m5-5-5 5 5 5" />,
    check: <path d="m5 12 4 4L19 6" />,
    shield: (
      <>
        <path d="M12 3 5 6v5c0 4.6 2.8 8.1 7 10 4.2-1.9 7-5.4 7-10V6l-7-3Z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
      </>
    ),
    clipboard: (
      <>
        <path d="M9 5H6v16h12V5h-3" />
        <rect x="9" y="3" width="6" height="4" rx="1" />
        <path d="m9 13 2 2 4-4" />
      </>
    ),
    signature: (
      <>
        <path d="M4 17c3-5 5-8 6-8 2 0-1 7 1 7 1.5 0 2-4 3-4s.5 4 2 4c1 0 2-1 4-3" />
        <path d="M4 20h16" />
      </>
    ),
    location: (
      <>
        <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    ),
    camera: (
      <>
        <path d="M4 7h4l2-3h4l2 3h4v13H4V7Z" />
        <circle cx="12" cy="13" r="4" />
      </>
    ),
    upload: (
      <>
        <path d="M12 16V4m0 0L7 9m5-5 5 5M5 15v4h14v-4" />
      </>
    ),
    close: <path d="m6 6 12 12M18 6 6 18" />,
    refresh: (
      <>
        <path d="M20 7v5h-5M4 17v-5h5" />
        <path d="M18.5 9A7 7 0 0 0 6 6.5L4 9m2 6a7 7 0 0 0 12 2.5L20 15" />
      </>
    ),
    arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
    lock: (
      <>
        <rect x="5" y="10" width="14" height="11" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
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

const checkInSteps: {
  number: number
  title: string
  detail: string
  icon: CheckIcon
}[] = [
  {
    number: 1,
    title: "Confirm identity",
    detail: "You and the resource",
    icon: "user",
  },
  {
    number: 2,
    title: "Initial condition",
    detail: "Condition and accessories",
    icon: "clipboard",
  },
  {
    number: 3,
    title: "Rules & signature",
    detail: "Acknowledge safe use",
    icon: "signature",
  },
  {
    number: 4,
    title: "Location sharing",
    detail: "Optional consent",
    icon: "location",
  },
]

function SignaturePad({
  onSignedChange,
}: {
  onSignedChange: (signed: boolean) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const ratio = window.devicePixelRatio || 1
    canvas.width = rect.width * ratio
    canvas.height = rect.height * ratio
    const context = canvas.getContext("2d")
    context?.scale(ratio, ratio)
  }, [])

  const point = (event: PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }

  const startDrawing = (event: PointerEvent<HTMLCanvasElement>) => {
    drawing.current = true
    event.currentTarget.setPointerCapture(event.pointerId)
    const context = event.currentTarget.getContext("2d")
    const current = point(event)
    if (!context) return
    context.beginPath()
    context.moveTo(current.x, current.y)
    context.strokeStyle = "#263c33"
    context.lineWidth = 2
    context.lineCap = "round"
    context.lineJoin = "round"
  }

  const draw = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return
    const context = event.currentTarget.getContext("2d")
    const current = point(event)
    if (!context) return
    context.lineTo(current.x, current.y)
    context.stroke()
    onSignedChange(true)
  }

  const clear = () => {
    const canvas = canvasRef.current
    const context = canvas?.getContext("2d")
    if (canvas && context) {
      context.save()
      context.setTransform(1, 0, 0, 1, 0, 0)
      context.clearRect(0, 0, canvas.width, canvas.height)
      context.restore()
    }
    onSignedChange(false)
  }

  return (
    <div className="signature-component">
      <div className="signature-toolbar">
        <span>Draw your signature below</span>
        <button onClick={clear}>
          <Icon name="refresh" size={13} />
          Clear
        </button>
      </div>
      <div className="signature-canvas-wrap">
        <canvas
          ref={canvasRef}
          onPointerDown={startDrawing}
          onPointerMove={draw}
          onPointerUp={() => {
            drawing.current = false
          }}
          onPointerCancel={() => {
            drawing.current = false
          }}
          aria-label="Signature drawing pad"
        />
        <span>Sign here</span>
        <i />
      </div>
    </div>
  )
}

export default function CheckInPage({ onBack }: { onBack: () => void }) {
  const [activeStep, setActiveStep] = useState(2)
  const [condition, setCondition] = useState("Good")
  const [accessories, setAccessories] = useState([
    "Build chamber",
    "Powder cartridge",
    "Cleaning brush",
  ])
  const [notes, setNotes] = useState("")
  const [photos, setPhotos] = useState<string[]>([])
  const [dragging, setDragging] = useState(false)
  const [rules, setRules] = useState([true, false, false])
  const [signed, setSigned] = useState(false)
  const [locationConsent, setLocationConsent] = useState(false)
  const [locationSkipped, setLocationSkipped] = useState(false)
  const [completed, setCompleted] = useState(false)

  const addPhotos = (files: FileList | null) => {
    if (!files) return
    setPhotos((current) => [
      ...current,
      ...Array.from(files).map((file) => file.name),
    ])
  }

  const toggleAccessory = (item: string) => {
    setAccessories((current) =>
      current.includes(item)
        ? current.filter((accessory) => accessory !== item)
        : [...current, item],
    )
  }

  const toggleRule = (index: number) => {
    setRules((current) =>
      current.map((value, ruleIndex) => (ruleIndex === index ? !value : value)),
    )
  }

  if (completed) {
    return (
      <div className="checkin-shell">
        <div className="checkin-complete">
          <span>
            <Icon name="check" size={31} />
          </span>
          <p>Check-in complete</p>
          <h1>Your session has started.</h1>
          <p>
            Formlabs Fuse 1+ 30W is checked out to you until 17:00. Report any
            condition changes before ending the session.
          </p>
          <div>
            <small>Session reference</small>
            <strong>SES–R102–0618</strong>
          </div>
          <button onClick={onBack}>Return to request</button>
        </div>
      </div>
    )
  }

  return (
    <div className="checkin-shell">
      <header className="checkin-header">
        <button className="checkin-back" onClick={onBack}>
          <Icon name="arrowLeft" size={17} />
          Exit check-in
        </button>
        <div className="equipment-verification">
          <span className="equipment-id">EQ–3048</span>
          <div>
            <strong>Formlabs Fuse 1+ 30W</strong>
            <span>
              <Icon name="shield" size={13} />
              Equipment ID verified at this station
            </span>
          </div>
        </div>
        <div className="usage-window">
          <span className="live-dot" />
          <div>
            <small>Scheduled usage window</small>
            <strong>In use until 17:00</strong>
          </div>
          <span>2h 42m remaining</span>
        </div>
      </header>

      <main className="checkin-main">
        <div className="checkin-intro">
          <div>
            <p>Booking #R-102 · Supervised access</p>
            <h1>Equipment check-in</h1>
            <span>
              Complete each step before beginning work. Your progress is saved
              automatically.
            </span>
          </div>
          <span className="checkin-progress">
            <strong>{activeStep}</strong> of 4 steps
          </span>
        </div>

        <div className="checkin-container">
          <aside className="checkin-steps">
            {checkInSteps.map((step) => (
              <button
                key={step.number}
                className={`${activeStep === step.number ? "active" : ""} ${
                  step.number < activeStep ? "complete" : ""
                }`}
                onClick={() => setActiveStep(step.number)}
              >
                <span className="step-symbol">
                  {step.number < activeStep ? (
                    <Icon name="check" size={14} />
                  ) : (
                    <Icon name={step.icon} size={16} />
                  )}
                </span>
                <span>
                  <small>Step {step.number}</small>
                  <strong>{step.title}</strong>
                  <em>{step.detail}</em>
                </span>
              </button>
            ))}
            <div className="checkin-security">
              <Icon name="lock" size={15} />
              Check-in data is encrypted and retained with the booking record.
            </div>
          </aside>

          <section className="checkin-step-content">
            {activeStep === 1 && (
              <div className="identity-step">
                <div className="step-heading">
                  <p>Step 1 · Identity &amp; resource</p>
                  <h2>Confirm what you&apos;re checking out</h2>
                  <span>
                    Make sure your identity and the equipment label match before
                    continuing.
                  </span>
                </div>
                <div className="identity-confirmation">
                  <div className="identity-person">
                    <span>AK</span>
                    <div>
                      <small>Authenticated user</small>
                      <strong>Alex Kim</strong>
                      <p>
                        Staff Researcher · Robotics &amp; Autonomous Systems
                      </p>
                    </div>
                    <em>
                      <Icon name="check" size={13} />
                      Verified
                    </em>
                  </div>
                  <div className="identity-resource">
                    <span className="resource-monogram">F1</span>
                    <div>
                      <small>Scanned resource</small>
                      <strong>Formlabs Fuse 1+ 30W</strong>
                      <p>Equipment ID EQ–3048 · Bay B12</p>
                    </div>
                    <em>
                      <Icon name="check" size={13} />
                      Match
                    </em>
                  </div>
                </div>
                <button
                  className="step-continue"
                  onClick={() => setActiveStep(2)}
                >
                  Confirm &amp; continue
                  <Icon name="arrow" size={16} />
                </button>
              </div>
            )}

            {activeStep === 2 && (
              <div className="condition-step">
                <div className="step-heading">
                  <p>Step 2 · Initial condition</p>
                  <h2>Record the equipment condition</h2>
                  <span>
                    This creates a before-use record for you and the facility
                    team.
                  </span>
                </div>

                <div className="condition-block">
                  <div className="field-title">
                    <strong>Overall condition</strong>
                    <span>Select the closest match</span>
                  </div>
                  <div className="condition-selector">
                    {[
                      {
                        label: "Good",
                        detail: "No visible damage",
                        tone: "good",
                      },
                      {
                        label: "Minor Wear",
                        detail: "Cosmetic wear only",
                        tone: "wear",
                      },
                      {
                        label: "Issue",
                        detail: "Needs attention",
                        tone: "issue",
                      },
                    ].map((option) => (
                      <button
                        key={option.label}
                        className={`${option.tone} ${
                          condition === option.label ? "selected" : ""
                        }`}
                        onClick={() => setCondition(option.label)}
                      >
                        <span>
                          <i />
                        </span>
                        <strong>{option.label}</strong>
                        <small>{option.detail}</small>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="condition-columns">
                  <div className="accessory-block">
                    <div className="field-title">
                      <strong>Accessories present</strong>
                      <span>Check each item you can see</span>
                    </div>
                    {[
                      "Build chamber",
                      "Powder cartridge",
                      "Cleaning brush",
                      "Sieve unit",
                    ].map((accessory) => (
                      <label key={accessory}>
                        <input
                          type="checkbox"
                          checked={accessories.includes(accessory)}
                          onChange={() => toggleAccessory(accessory)}
                        />
                        <span>
                          <Icon name="check" size={11} />
                        </span>
                        {accessory}
                      </label>
                    ))}
                  </div>
                  <label className="consumable-notes">
                    <span className="field-title">
                      <strong>Consumable notes</strong>
                      <span>Optional</span>
                    </span>
                    <textarea
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      placeholder="Note remaining powder level, opened materials, or anything unusual..."
                    />
                    <small>{notes.length}/240</small>
                  </label>
                </div>

                <div className="photo-section">
                  <div className="field-title">
                    <strong>Before-Use Photos</strong>
                    <span>Recommended · Up to 6 images</span>
                  </div>
                  <label
                    className={
                      dragging ? "photo-dropzone dragging" : "photo-dropzone"
                    }
                    onDragOver={(event: DragEvent<HTMLLabelElement>) => {
                      event.preventDefault()
                      setDragging(true)
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(event: DragEvent<HTMLLabelElement>) => {
                      event.preventDefault()
                      setDragging(false)
                      addPhotos(event.dataTransfer.files)
                    }}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(event: ChangeEvent<HTMLInputElement>) =>
                        addPhotos(event.target.files)
                      }
                    />
                    <span>
                      <Icon name="camera" size={22} />
                    </span>
                    <div>
                      <strong>Drag photos here or click to upload</strong>
                      <small>JPG, PNG or HEIC · 10 MB each</small>
                    </div>
                    <em>
                      <Icon name="upload" size={14} />
                      Browse
                    </em>
                  </label>
                  {photos.length > 0 && (
                    <div className="photo-list">
                      {photos.map((photo, index) => (
                        <span key={`${photo}-${index}`}>
                          <Icon name="camera" size={14} />
                          <strong>{photo}</strong>
                          <button
                            onClick={() =>
                              setPhotos((current) =>
                                current.filter(
                                  (_, photoIndex) => photoIndex !== index,
                                ),
                              )
                            }
                            aria-label={`Remove ${photo}`}
                          >
                            <Icon name="close" size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeStep === 3 && (
              <div className="rules-step">
                <div className="step-heading">
                  <p>Step 3 · Rules &amp; signature</p>
                  <h2>Acknowledge safe-use rules</h2>
                  <span>
                    Read and confirm each rule, then add your signature.
                  </span>
                </div>
                <div className="rule-list">
                  {[
                    "I will operate the equipment only within my approved access mode.",
                    "I will not introduce unapproved powders or modify safety settings.",
                    "I will stop use and notify the facility team if any issue occurs.",
                  ].map((rule, index) => (
                    <label key={rule}>
                      <input
                        type="checkbox"
                        checked={rules[index]}
                        onChange={() => toggleRule(index)}
                      />
                      <span>
                        <Icon name="check" size={12} />
                      </span>
                      <strong>{rule}</strong>
                    </label>
                  ))}
                </div>
                <div className="signature-heading">
                  <div>
                    <strong>Digital signature</strong>
                    <span>Sign to confirm the acknowledgments above</span>
                  </div>
                  <em>Demo Tag</em>
                </div>
                <SignaturePad onSignedChange={setSigned} />
                <p
                  className={
                    signed ? "signature-status signed" : "signature-status"
                  }
                >
                  <Icon name={signed ? "check" : "signature"} size={14} />
                  {signed
                    ? "Signature captured"
                    : "A signature is required to complete check-in"}
                </p>
              </div>
            )}

            {activeStep === 4 && (
              <div className="location-step">
                <div className="step-heading">
                  <p>Step 4 · Optional location sharing</p>
                  <h2>Share location during your session?</h2>
                  <span>
                    This helps facility staff provide faster support. It is
                    optional and never blocks check-in.
                  </span>
                </div>
                <div className="location-illustration">
                  <span className="location-pulse">
                    <Icon name="location" size={27} />
                  </span>
                  <div>
                    <strong>Session-only location</strong>
                    <p>
                      Your approximate position is visible only to on-duty
                      facility staff and automatically stops at 17:00.
                    </p>
                  </div>
                </div>
                <label className="location-consent">
                  <input
                    type="checkbox"
                    checked={locationConsent}
                    onChange={() => {
                      setLocationConsent(!locationConsent)
                      setLocationSkipped(false)
                    }}
                  />
                  <span>
                    <i />
                  </span>
                  <div>
                    <strong>Share my location for this session</strong>
                    <small>Stops automatically when you check out</small>
                  </div>
                </label>
                <button
                  className={
                    locationSkipped ? "skip-location skipped" : "skip-location"
                  }
                  onClick={() => {
                    setLocationSkipped(true)
                    setLocationConsent(false)
                  }}
                >
                  {locationSkipped ? (
                    <>
                      <Icon name="check" size={14} />
                      Location sharing skipped
                    </>
                  ) : (
                    "Skip — continue without sharing"
                  )}
                </button>
              </div>
            )}
          </section>
        </div>
      </main>

      <footer className="checkin-footer">
        <div>
          <Icon name="shield" size={16} />
          <span>
            Your check-in record is visible to you and authorized facility
            staff.
          </span>
        </div>
        <div className="checkin-footer-actions">
          {activeStep > 1 && (
            <button
              className="previous-step"
              onClick={() => setActiveStep(activeStep - 1)}
            >
              Previous
            </button>
          )}
          {activeStep < 4 && (
            <button
              className="next-step"
              onClick={() => setActiveStep(activeStep + 1)}
            >
              Next step
              <Icon name="arrow" size={15} />
            </button>
          )}
          <button
            className="complete-checkin"
            onClick={() => setCompleted(true)}
          >
            <Icon name="check" size={16} />
            Complete Check-In &amp; Start Session
          </button>
        </div>
      </footer>
    </div>
  )
}
