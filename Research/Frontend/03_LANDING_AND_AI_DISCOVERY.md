# Step 03: Landing Page & AI-Powered Need Discovery

This guide details the homepage natural language need search (`/`) and the multi-criteria results page (`/discover`).

---

## 1. Landing Page (`/`) Architecture (Section 5.1)

The landing page allows users to either browse standard categories or describe their research needs in plain English:

```
+-------------------------------------------------------------------+
| Hero Headline: "Find equipment, tools, and labs you can use"      |
| [ Describe what you need... e.g. '3D print small SLA gears' ] [Find]|
| Quick Filter Chips: [Fabrication] [Microscopy] [Electronics] [Free]|
+-------------------------------------------------------------------+
| How it works: 1. Find -> 2. Check Eligibility -> 3. Request Access|
+-------------------------------------------------------------------+
| Featured Resources Grid                 | Partner Institutions    |
+-------------------------------------------------------------------+
```

### Search Submission Logic
1. User enters: *"I need to print small biocompatible gear components with 50 micron layer height"*.
2. Submitting navigates to `/discover?q=...&ai=true`.

---

## 2. Discover Page (`/discover`) Architecture (Section 5.2)

### 2.1 Layout
- **Left Column (Filters):** Category, Institution, Access mode (`INDEPENDENT`, `SUPERVISED`, `STAFF_SERVICE`), Distance radius, Max cost, *"Only what I am eligible for"* toggle.
- **Top Row (Parsed Needs):** When AI parses multiple items, it displays editable chips:
  `[3D Printer (SLA)] [Microscope]`
- **Main Area (Results):** `ResourceCard` components grouped by match relevance.

### 2.2 The `ResourceCard` Component
Displays essential decision criteria at a glance:
- Photo thumbnail, Resource name, Facility name, and City.
- **Match Label Badge:**
  - `Available listing` (Green)
  - `Potential match (needs verification)` (Amber)
  - `Not currently available` (Gray)
- **Why this match? Popover:** Shows exact matched fields (`category`, `capabilities`, `specs`).
- **Source Indicator:** Displays `AI suggestion` or `Keyword search fallback`.
- **Cost Badge:** e.g. *"Free"* or *"2 tokens/hr"* or *"Quote required"*.
- **Eligibility Preview:** *"Training required: 3D Basics"* or *"Eligible to request"*.
- **Next Free Slot:** e.g. *"Tomorrow at 10:00"*.

---

## 3. Fallback Banner State Handling

If the Python AI service times out or the keyword fallback was used:
```tsx
{source === 'KEYWORD_FALLBACK' && (
  <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-2.5 rounded-xl text-sm flex items-center justify-between mb-4">
    <div className="flex items-center gap-2">
      <Info className="w-4 h-4 text-amber-600" />
      <span>AI matching service is offline; keyword & synonym search was used.</span>
    </div>
    <span className="text-xs text-amber-700 font-semibold">Standard Fallback Active</span>
  </div>
)}
```

---

## 4. Implementation Checklist

- [ ] Build `LandingPage.tsx` with hero search input and category chips.
- [ ] Build `DiscoverPage.tsx` with filter sidebar and TanStack Query integration.
- [ ] Implement `ResourceCard.tsx` with match reasons popover and eligibility preview.
