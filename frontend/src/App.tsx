import { useState } from "react"
import CheckInPage from "./CheckInPage"
import DemoToolbar from "./DemoToolbar"
import DetailPage from "./DetailPage"
import IntroPage from "./IntroPage"
import ReviewQueue from "./ReviewQueue"
import RequestWizard from "./RequestWizard"
import ResultsPage from "./ResultsPage"

type DemoStage = "home" | "search" | "request" | "approve" | "checkin"

export default function App() {
  const [page, setPage] =
    useState<"intro" | "results" | "detail" | "review" | "checkin">("intro")
  const [requestOpen, setRequestOpen] = useState(false)

  const openDetail = () => {
    setRequestOpen(false)
    setPage("detail")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const openResults = () => {
    setRequestOpen(false)
    setPage("results")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const jumpTo = (destination: DemoStage) => {
    setRequestOpen(false)
    if (destination === "home") setPage("intro")
    if (destination === "search") setPage("results")
    if (destination === "request") {
      setPage("detail")
      setRequestOpen(true)
    }
    if (destination === "approve") setPage("review")
    if (destination === "checkin") setPage("checkin")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const activeStage: DemoStage | undefined = requestOpen
    ? "request"
    : page === "intro"
      ? "home"
      : page === "results"
        ? "search"
        : page === "review"
          ? "approve"
          : page === "checkin"
            ? "checkin"
            : undefined

  return (
    <>
      <DemoToolbar activeStage={activeStage} onJump={jumpTo} />
      <div className="demo-app-content">
        <div className="page-transition" key={page}>
          {page === "intro" ? (
            <IntroPage
              onDiscover={() => {
                setPage("results")
                window.scrollTo({ top: 0, behavior: "smooth" })
              }}
            />
          ) : page === "results" ? (
            <ResultsPage onViewDetails={openDetail} />
          ) : page === "checkin" ? (
            <CheckInPage onBack={() => setPage("review")} />
          ) : page === "review" ? (
            <ReviewQueue
              onBack={() => setPage("detail")}
              onOpenCheckIn={() => {
                setPage("checkin")
                window.scrollTo({ top: 0, behavior: "smooth" })
              }}
            />
          ) : requestOpen ? (
            <RequestWizard
              onClose={() => setRequestOpen(false)}
              onOpenReview={() => {
                setRequestOpen(false)
                setPage("review")
                window.scrollTo({ top: 0, behavior: "smooth" })
              }}
            />
          ) : (
            <DetailPage
              onBack={openResults}
              onRequest={() => setRequestOpen(true)}
            />
          )}
        </div>
      </div>
    </>
  )
}
