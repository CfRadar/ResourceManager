import { useState } from "react"

type WizardIcon = "close" | "check" | "calendar" | "clock" | "chevronLeft" | "chevronRight" | "alert" | "sparkles" | "shield" | "save" | "arrow"

function Icon({ name, size = 18 }: { name: WizardIcon; size?: number }) {
  const paths = {
    close: <path d="m6 6 12 12M18 6 6 18" />,
    check: <path d="m5 12 4 4L19 6" />,
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
    chevronLeft: <path d="m15 18-6-6 6-6" />,
    chevronRight: <path d="m9 18 6-6-6-6" />,
    alert: (
      <>
        <path d="M12 3 2.8 20h18.4L12 3Z" />
        <path d="M12 9v5m0 3h.01" />
      </>
    ),
    sparkles: (
      <>
        <path d="m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2L12 3Z" />
        <path d="m18 14 .7 2.3L21 17l-2.3.7L18 20l-.7-2.3L15 17l2.3-.7L18 14Z" />
      </>
    ),
    shield: (
      <>
        <path d="M12 3 5 6v5c0 4.6 2.8 8.1 7 10 4.2-1.9 7-5.4 7-10V6l-7-3Z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
    save: (
      <>
        <path d="M5 3h12l2 2v16H5V3Z" />
        <path d="M8 3v6h8V3M8 21v-7h8v7" />
      </>
    ),
    arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
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

const steps = [
  { number: 1, title: "Mode" },
  { number: 2, title: "Time Slot" },
  { number: 3, title: "Purpose & Materials" },
  { number: 4, title: "Requirements" },
  { number: 5, title: "Review & Submit" },
]

const calendarDays = [
  null,
  null,
  null,
  null,
  null,
  null,
  1,
  2,
  3,
  4,
  5,
  6,
  7,
  8,
  9,
  10,
  11,
  12,
  13,
  14,
  15,
  16,
  17,
  18,
  19,
  20,
  21,
  22,
  23,
  24,
  25,
  26,
  27,
  28,
  29,
  30,
]

const slots = [
  { time: "08:00", state: "available" },
  { time: "09:00", state: "available" },
  { time: "10:00", state: "taken" },
  { time: "11:00", state: "taken" },
  { time: "13:00", state: "available" },
  { time: "14:00", state: "available" },
  { time: "15:00", state: "conflict" },
  { time: "16:00", state: "available" },
]

export default function RequestWizard({
  onClose,
  onOpenReview,
}: {
  onClose: () => void
  onOpenReview: () => void
}) {
  const [selectedDay, setSelectedDay] = useState(18)
  const [selectedTime, setSelectedTime] = useState("14:00")
  const [conflictTime, setConflictTime] = useState("")
  const [draftSaved, setDraftSaved] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const selectSlot = (time: string, state: string) => {
    if (state === "taken" || state === "conflict") {
      setConflictTime(time)
      return
    }
    setConflictTime("")
    setSelectedTime(time)
  }

  return (
    <div className="wizard-overlay" role="presentation">
      <section
        className="request-wizard"
        role="dialog"
        aria-modal="true"
        aria-labelledby="wizard-title"
      >
        <header className="wizard-header">
          <div className="wizard-brand">
            <span className="wizard-brand-mark">
              <i />
              <i />
              <i />
            </span>
            <div>
              <span>Access request</span>
              <strong>Formlabs Fuse 1+ 30W</strong>
            </div>
          </div>
          <span className="draft-status">
            {draftSaved ? "Draft saved just now" : "Changes save automatically"}
          </span>
          <button onClick={onClose} aria-label="Close request wizard">
            <Icon name="close" size={19} />
          </button>
        </header>

        <div className="wizard-stepper" aria-label="Request progress">
          {steps.map((step) => (
            <div
              key={step.number}
              className={
                step.number === 2
                  ? "wizard-step active"
                  : step.number < 2
                    ? "wizard-step complete"
                    : "wizard-step"
              }
            >
              <span>
                {step.number < 2 ? (
                  <Icon name="check" size={13} />
                ) : (
                  step.number
                )}
              </span>
              <div>
                <small>Step {step.number}</small>
                <strong>{step.title}</strong>
              </div>
            </div>
          ))}
        </div>

        {submitted ? (
          <div className="wizard-success">
            <span>
              <Icon name="check" size={29} />
            </span>
            <p>Request submitted</p>
            <h2>Your access request is now under review.</h2>
            <p>
              The facility team will confirm availability and your requirements
              within one working day.
            </p>
            <div>
              <small>Request reference</small>
              <strong>CG–240618–014</strong>
            </div>
            <button onClick={onClose}>Return to resource</button>
            <button className="manager-review-link" onClick={onOpenReview}>
              Open manager review queue
            </button>
          </div>
        ) : (
          <>
            <div className="wizard-body">
              <main className="slot-picker">
                <div className="wizard-title">
                  <p>Step 2 of 5 · Time Slot</p>
                  <h1 id="wizard-title">When would you like to use it?</h1>
                  <span>
                    Choose an available two-hour window. Your selection is not
                    held until the request is approved.
                  </span>
                </div>

                <div className="picker-grid">
                  <section className="calendar-card">
                    <div className="calendar-heading">
                      <button aria-label="Previous month">
                        <Icon name="chevronLeft" size={16} />
                      </button>
                      <div>
                        <strong>June 2025</strong>
                        <span>Choose a date</span>
                      </div>
                      <button aria-label="Next month">
                        <Icon name="chevronRight" size={16} />
                      </button>
                    </div>
                    <div className="weekdays">
                      {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
                        (day) => (
                          <span key={day}>{day}</span>
                        ),
                      )}
                    </div>
                    <div className="calendar-grid">
                      {calendarDays.map((day, index) =>
                        day ? (
                          <button
                            key={day}
                            className={`${
                              selectedDay === day ? "selected" : ""
                            } ${
                              [2, 5, 12, 19, 26].includes(day) ? "limited" : ""
                            }`}
                            onClick={() => setSelectedDay(day)}
                          >
                            {day}
                            {[3, 4, 10, 13, 17, 18, 20, 24, 27].includes(
                              day,
                            ) && <i />}
                          </button>
                        ) : (
                          <span key={`blank-${index}`} />
                        ),
                      )}
                    </div>
                    <div className="calendar-legend">
                      <span>
                        <i className="available" /> Available
                      </span>
                      <span>
                        <i className="limited" /> Limited
                      </span>
                    </div>
                  </section>

                  <section className="times-card">
                    <div className="times-heading">
                      <div>
                        <strong>Wednesday, {selectedDay} June</strong>
                        <span>2-hour sessions · GMT+1</span>
                      </div>
                      <span className="availability-count">
                        5 slots available
                      </span>
                    </div>
                    <div className="slot-legend">
                      <span>
                        <i className="open" /> Available
                      </span>
                      <span>
                        <i className="selected" /> Selected
                      </span>
                      <span>
                        <i className="unavailable" /> Unavailable
                      </span>
                    </div>
                    <div className="time-slots">
                      {slots.map((slot) => (
                        <button
                          key={slot.time}
                          className={`${slot.state} ${
                            selectedTime === slot.time ? "selected" : ""
                          }`}
                          onClick={() => selectSlot(slot.time, slot.state)}
                        >
                          <Icon name="clock" size={14} />
                          <strong>{slot.time}</strong>
                          <span>
                            {slot.state === "available"
                              ? `${slot.time}–${String(
                                  Number(slot.time.slice(0, 2)) + 2,
                                ).padStart(2, "0")}:00`
                              : slot.state === "taken"
                                ? "Taken"
                                : "Calendar conflict"}
                          </span>
                        </button>
                      ))}
                    </div>

                    {conflictTime && (
                      <div className="alternative-card">
                        <span className="alternative-icon">
                          <Icon name="sparkles" size={17} />
                        </span>
                        <div>
                          <strong>{conflictTime} is not available</strong>
                          <p>
                            We found the closest times that still fit your
                            two-hour request.
                          </p>
                          <div>
                            <button
                              onClick={() => selectSlot("14:00", "available")}
                            >
                              Today · 14:00
                            </button>
                            <button
                              onClick={() => selectSlot("09:00", "available")}
                            >
                              Thu 19 · 09:00
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </section>
                </div>
              </main>

              <aside className="booking-sidebar">
                <section className="booking-summary">
                  <p>Current selection</p>
                  <h2>Wed, {selectedDay} June</h2>
                  <div className="selected-window">
                    <Icon name="clock" size={18} />
                    <div>
                      <strong>
                        {selectedTime}–
                        {String(Number(selectedTime.slice(0, 2)) + 2).padStart(
                          2,
                          "0",
                        )}
                        :00
                      </strong>
                      <span>2 hours · Supervised</span>
                    </div>
                  </div>
                  <dl>
                    <div>
                      <dt>Equipment</dt>
                      <dd>Formlabs Fuse 1+ 30W</dd>
                    </div>
                    <div>
                      <dt>Facility</dt>
                      <dd>Advanced Manufacturing Lab</dd>
                    </div>
                    <div>
                      <dt>Cost</dt>
                      <dd>Free · fair-use limits</dd>
                    </div>
                  </dl>
                </section>

                <section className="fair-use-card">
                  <div className="fair-use-heading">
                    <span>
                      <Icon name="shield" size={17} />
                    </span>
                    <div>
                      <p>Fair-use meter</p>
                      <strong>6 of 8 hours</strong>
                    </div>
                  </div>
                  <div className="fair-gauge">
                    <span />
                  </div>
                  <p>
                    After this booking you will have used{" "}
                    <strong>6 of 8 hours</strong> this week.
                  </p>
                  <div className="usage-scale">
                    <span>0 hrs</span>
                    <span>Weekly limit · 8 hrs</span>
                  </div>
                </section>

                <div className="fair-notice">
                  <Icon name="alert" size={17} />
                  <p>
                    Your weekly allowance resets on Monday at 00:00. Unused time
                    does not carry over.
                  </p>
                </div>
              </aside>
            </div>

            <footer className="wizard-footer">
              <div className="wizard-footer-note">
                <Icon name="alert" size={16} />
                <span>Submitting a request does not reserve the slot.</span>
              </div>
              <div>
                <button
                  className="save-draft"
                  onClick={() => setDraftSaved(true)}
                >
                  <Icon name="save" size={15} />
                  {draftSaved ? "Draft Saved" : "Save Draft"}
                </button>
                <button
                  className="submit-wizard"
                  onClick={() => setSubmitted(true)}
                >
                  Submit Request
                  <Icon name="arrow" size={16} />
                </button>
              </div>
            </footer>
          </>
        )}
      </section>
    </div>
  )
}
