# DANNY'STHENICS — Coach Pro Athletic Portal

A dark-mode calisthenics and conditioning coaching portal built in **React (TypeScript + Tailwind CSS)** implementing the exact three screens provided: **Coach Login & Express QR Check-In**, **Member Directory & Inactivity Outreach**, and **Batch Attendance & Workout Check-In**. Styled with the **Kinetic Obsidian** typography and dark surface system paired with the **DANNY'STHENICS** crimson, emerald, and volt-lime accent palette, with all cohorts, check-ins, workout assignments, and outreach logs persisted locally in browser storage.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> This plan has been updated to match your three uploaded reference screens while cleaning up visual layout glitches (text overlap on the welcome hero, fallback serif fonts, clipped tags, and placeholder `img` boxes). Review and click **Proceed** to begin building.

- **Confirmed Brand & Copy**: **DANNY'STHENICS** (`Calisthenics & Conditioning` · `Coach Pro`) in React + TypeScript + Tailwind CSS.
- **Confirmed Screen 1 — Login & Express Check-In**: Dual-card obsidian landing screen with **Coach Login** (`coach.danny@dannysthenics.com`, password visibility toggle, Remember Me, Forgot Password helper) on the left and **Express Check-In** (QR scanner viewfinder + `Open Kiosk Mode` action) on the right.
- **Confirmed Screen 2 — Member Directory & Inactivity**: 4-card directory KPI strip (`Directory Registry`, `Currently Active`, `At-Risk 1–2 Wks`, `Inactive >30 Days`), automated retention outreach panel with live editable WhatsApp/SMS `[First Name]` template preview and 1-click batch dispatch, live dispatch log banner, segmented status filters, `+ New Member` modal, and member roster table with 1-click outreach actions and a `View History` athlete slide-over drawer.
- **Confirmed Screen 3 — Batch Attendance & Check-In**: 5:7 split workspace with **Batch Check-In** on the left (live check-in counter, NFC/name/ID search, `+ Select Entire Morning Batch`, queued athlete chips, ingress lane selector, `Confirm & Check In` CTA, auto-deduct credit toggle) and **Today's Checked-In Members** on the right (`All` / `Pending Workout` / `Completed` tabs, tap-to-toggle workout tags for `Agility`, `Flexibility`, `Core`, and `Weight Training`, `All Done` quick completion, remove action, `Export Attendance CSV`, and `Print Daily Sheet`).
- **Confirmed Persistence**: Browser `localStorage` preloaded with realistic **DANNY'STHENICS** athlete cohorts so every check-in, workout toggle, outreach dispatch, and new member persists across refreshes.

---

## 1. Overview & Core Concept

- **What It Does**: Gives front-desk trainers and strength coaches a fast, unified workstation to authenticate or launch kiosk check-in, run rapid multi-athlete batch ingress with live workout tag tracking, and spot at-risk or dormant members for 1-click WhatsApp/SMS re-engagement.
- **Target Audience / Persona**: Calisthenics & conditioning coaches (e.g., Coach Danny) and front-desk staff managing high-tempo studio sessions on desktop terminals or handheld tablets.
- **Key Value**: Eliminates friction during peak class rush hours through single-tap batch queuing and workout tag completion while turning inactivity metrics directly into actionable 1-click member outreach.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Screen 1 — Coach Login & Express Check-In**:
   - Centered **WELCOME TO DANNY'STHENICS** header with clean vertical spacing (fixing the overlapping subtitle in the reference) above two equal-height Tier-2 dark cards.
   - **Coach Login**: Pre-populated demo email (`coach.danny@dannysthenics.com`) with password mask/reveal toggle, Remember Me persistence, inline validation, and emerald `LOG IN →` CTA that enters the Coach Pro workspace.
   - **Express Check-In**: Stylized QR viewfinder with emerald alignment brackets and `OPEN KIOSK MODE` button that opens an interactive self-service check-in modal/view where athletes can enter or simulate scanning their `#ID` badge to check straight into today's roster.

2. **Screen 2 — Member Directory & Inactivity**:
   - **Live Dispatch Confirmation Bar**: Dismissible top banner showing the latest logged WhatsApp/SMS outreach (e.g., Sophia Chen at 9:15 AM), updating live whenever the coach triggers individual or batch outreach.
   - **4-Column Directory Metrics**: Live computed cards for `Directory Registry`, `Currently Active`, `At-Risk (1–2 Wks)`, and `Inactive (>30 Days)` using monospaced tabular figures.
   - **Retention Outreach Panel**: Two-column spotlight showing the current count of 1–2 week inactive members alongside an editable WhatsApp/SMS template (`Hey [First Name]! Coach Danny noticed you missed this week at DANNY'STHENICS...`) and a `Send 1-Click WhatsApp/SMS Outreach` button.
   - **Directory Toolbar & Roster Table**: Filter tabs (`All Members`, `Active`, `Inactive: 1–2 Weeks`, `Inactive: 1 Month+`), live search by name/phone/ID, `Select Inactive` bulk selector, `+ New Member` modal, and a clean roster table with checkboxes, `PF-ID` + membership tier, phone number, status/lull duration, last attended session, weekly cadence (`d/wk`), 1-click WhatsApp & SMS icon buttons, and `View History` (opens a Tier-3 slide-over drawer showing the athlete's workout history and longitudinal attendance chart).

3. **Screen 3 — Batch Attendance & Check-In**:
   - **Left 5-Column Panel (`Batch Check-In`)**: Displays `Today's Check-Ins` live counter, search/NFC scan input with instant autocomplete + Enter-to-queue, `+ Select Entire Morning Batch` button, queued athlete chip list with individual remove `×` buttons, ingress lane selector (`Turnstile A · Optical Lane`, `Gate 01 NFC`, `Desk Fast-Check`), `Confirm & Check In (N Members)` primary button, `Auto-deducts session credit` toggle, and `Clear Selection`.
   - **Right 7-Column Panel (`Today's Checked-In Members`)**: Filter tabs (`All`, `Pending Workout`, `Completed`) above a live attendance table showing each checked-in athlete, check-in timestamp and ingress gate, four interactive workout completion buttons (`Agility`, `Flexibility`, `Core`, `Weight Training` — tap to toggle active checkmark state), `All Done` / `Completed` action, remove button, plus working `Export Attendance CSV` and `Print Daily Sheet` triggers.

### Visual Identity & Theme (*Kinetic Obsidian × DANNY'STHENICS*)

- **Color Palette & Surface Hierarchy**:
  - **Tier 0 Canvas (60%)**: `#090D16` / `#0F131C` deep obsidian backdrop.
  - **Tier 1 Table & Recessed Wells (30%)**: `#0F172A` / `#131823` with `1px solid rgba(255, 255, 255, 0.07)` hairlines.
  - **Tier 2 Elevated Modules**: `#181C26` / `#1C212E` with crisp `1px solid rgba(255, 255, 255, 0.10)` borders (`8px` radius).
  - **Tier 3 Modals & Drawers**: `#131C2E` with subtle perimeter glow and dark scrim backdrop.
  - **Brand & High-Urgency Crimson (`#E62020` / `#EF233C`)**: Active nav tab, `DANNY'STHENICS` brand highlights, `Confirm & Check In`, `Send Outreach`, `+ New Member`, and completed workout tags.
  - **Kinetic Emerald (`#10B981` / `#4EDEA3`)**: `LOG IN →` CTA, QR scanner frame, `Currently Active` metrics, high-cadence indicators, and WhatsApp dispatch confirmations.
  - **Volt Lime (`#C3F400` / `#ABD600`)**: `At-Risk (1–2 Wks)` warnings, `[First Name]` template token highlight, and pending outreach alerts.
- **Typography & Visual Polish Fixes**:
  - Replaces the unstyled fallback serif fonts in the mockups with the **Kinetic Obsidian** triad: **Space Grotesk** (headings & brand titles, `text-wrap: balance`), **Hanken Grotesk** (body copy & tables), and **JetBrains Mono** (`tabular-nums` on every metric, ID, cadence, and timestamp).
  - Replaces raw gray `img` boxes with clean, high-contrast athlete monogram avatars color-coded by membership tier so zero broken images ever appear.
  - Enforces single-line controls (`whitespace-nowrap shrink-0`) across all nav tabs, filter buttons, and workout tags so labels never clip or wrap awkwardly.
  - Keeps the footer clean and authentic (`© 2026 DANNY'STHENICS Coach Pro`) without fabricated system FPS/compiler telemetry bars.

### Interactive Feedback & Motion

- **Tactile State Updates**: Workout tag toggles, batch check-in confirmation, and 1-click outreach respond in `100ms–160ms` using compositor-only `transform` and `opacity` transitions (`prefers-reduced-motion` respected).
- **Complete States**: Populated rosters, filtered empty states with one-click filter reset, inline form validation, and non-blocking toast confirmations with undo where appropriate.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Unified Three-Screen Navigation with Persistent Workspace Bar**
  - *Chosen Approach*: After signing in from Screen 1 (or jumping back via Sign Out / Express Kiosk), the authenticated top bar seamlessly switches between **Batch Attendance & Check-In** and **Member Directory & Inactivity**, plus exposes a quick **Express Kiosk** trigger and **Coach Account / Reset Demo Data** menu.
  - *Why*: Matches the exact navigation structure shown in your screenshots while keeping all controls real, wired, and free of dead links (omitting unfinished placeholder tabs until you request them).
  - *Alternatives Considered*: Keeping inactive dummy tabs for unbuilt screens—rejected to guarantee zero dead clicks.

- **Decision 2: Interactive Athlete History Slide-Over on `View History`**
  - *Chosen Approach*: Clicking `VIEW HISTORY` on any member row in Screen 2 opens a clean Tier-3 slide-over drawer displaying that athlete's check-in history, completed workout tags, session credits, and a Kinetic Obsidian longitudinal attendance/cadence chart.
  - *Why*: Makes every action in the Member Directory genuinely useful and satisfies student-level progress inspection without cluttering the main directory table.

- **Decision 3: Versioned `localStorage` Persistence with Real Seeded Cohorts**
  - *Chosen Approach*: Preload realistic athletes matching your reference names (`Sophia Chen`, `David Miller`, `Liam O'Connor`, `Devon Ray`, `Elena Rostova`, `Carlos Mendoza`, `Tariq Khan`, `K. Henderson`, `J. Morales`, `A. Chen`, and additional studio members) with live derived counts, check-in records, workout tag states, and outreach history saved in `localStorage`.
  - *Why*: Every number across both screens stays mathematically consistent in real time (checking in a queued member immediately updates Today's Check-Ins and their Last Attended Session in the Directory).

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

### Architecture & Component Diagram

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                    Browser localStorage Data Store                      │
│   [Session Auth] · [Members Roster] · [Today Check-Ins] · [Outreach]    │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │ reactive state + mutations
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       DANNY'STHENICS App Shell                          │
│         (Auth Gate · Screen Router · Express Kiosk Modal · Toasts)      │
└───────────────┬─────────────────────────────────────────┬───────────────┘
                │ Signed Out                              │ Signed In
                ▼                                         ▼
┌───────────────────────────────┐     ┌───────────────────────────────────┐
│   Screen 1: Login & Express   │     │      Coach Pro Navigation Bar     │
│ ┌───────────────────────────┐ │     │  DANNY'STHENICS · 2 Core Views    │
│ │ Left: Coach Login Form    │ │     │  · Express Kiosk · Account Menu   │
│ │ Right: QR Viewfinder +    │ │     └─────────────────┬─────────────────┘
│ │        Open Kiosk Mode    │ │                       │
│ └───────────────────────────┘ │      ┌────────────────┴────────────────┐
└───────────────────────────────┘      ▼                                 ▼
                      ┌─────────────────────────────────┐ ┌──────────────────────────────┐
                      │ Screen 2: Member Directory &    │ │ Screen 3: Batch Attendance   │
                      │           Inactivity            │ │           & Check-In         │
                      │ • Live Dispatch Banner          │ │ • Left (5-col):              │
                      │ • 4 KPI Stat Cards              │ │   Today's Counter, Search,   │
                      │ • Retention Outreach Template   │ │   Queued Chips, Lane Select, │
                      │ • Status Tabs + Search + Add    │ │   Confirm & Check-In CTA     │
                      │ • Roster Table + 1-Click Send   │ │ • Right (7-col):             │
                      │ • Slide-Over History Drawer     │ │   Checked-In Filter Tabs,    │
                      └─────────────────────────────────┘ │   Workout Tag Toggles,       │
                                                          │   All Done, CSV & Print      │
                                                          └──────────────────────────────┘
```

### Data Model & State

- **Member**: `{ id, pfId, name, initials, tier, phone, status ('active' | 'at_risk' | 'inactive'), daysSinceLastVisit, lastAttendedLabel, lastWorkoutClass, cadencePerWeek, creditsRemaining, outreachHistory[], workoutHistory[] }`
- **CheckInEntry**: `{ id, memberId, checkInTime, ingressGate, workouts: { agility: boolean, flexibility: boolean, core: boolean, weightTraining: boolean } }`
- **OutreachDispatch**: `{ id, memberName, channel ('WhatsApp' | 'SMS'), timestamp, messagePreview, recipientCount }`
- **AppState**: Persisted under a versioned `localStorage` key (`dannysthenics_coach_pro_v1`), keeping Screen 2 and Screen 3 synchronized so checking in a member automatically updates their activity status and last attended timestamp.

### Interactive Component & State Mapping

- **Login & Express Kiosk**: Validates credentials, persists session on `Remember me`, opens interactive Express QR / Badge Kiosk overlay directly from Screen 1 or the workspace header, and logs kiosk check-ins straight into Screen 3.
- **Member Directory & Inactivity**: Live search + status tab filtering; `Select Inactive` toggles checkboxes for all 1–2 week inactive members; editable `[First Name]` template preview updates dynamically; clicking individual WhatsApp/SMS buttons or batch outreach appends to `outreachHistory`, updates the top confirmation banner, and shows a toast; `+ New Member` validates and appends a new athlete; `View History` opens the slide-over detail drawer.
- **Batch Attendance & Check-In**: Autocomplete search and `+ Select Entire Morning Batch` populate the check-in queue; `Confirm & Check In` moves queued athletes into Today's Checked-In table (optionally deducting 1 session credit) and updates their directory status to `Active`; tapping any of the 4 workout tags (`Agility`, `Flexibility`, `Core`, `Weight Training`) or `All Done` mutates completion status live and updates `Pending Workout` / `Completed` counts; `Export Attendance CSV` downloads a formatted `.csv` file and `Print Daily Sheet` triggers a clean print view.
