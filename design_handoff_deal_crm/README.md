# Handoff: Deal CRM (cash-offer pipeline)

## Overview
Desktop CRM for one user who makes cash offers on homes through listing agents. Purpose: record who was contacted, keep notes per deal and per property, schedule follow-ups as tasks, and work hot leads to under contract. No existing CRM; this is a greenfield build.

## About the Design Files
The HTML files are **design references**: prototypes showing intended look and behavior, not production code. Recreate them in the target codebase's environment using its patterns and libraries. If none exists, pick a suitable stack (e.g. React + TypeScript, a router, REST/Postgres, auth).

- `Deal CRM App.dc.html`: clickable prototype, primary reference. Logic is in the `<script data-dc-script>` class at the bottom (`seed()`, `seedTasks()`, `seedViews()`, `renderVals()`). Open it in a browser to click through.
- `Deal CRM Explorations.dc.html`: earlier static layout options (superseded; reference only).
- `design-system/`: Zoodealio tokens (`styles.css`) and Button / Badge / Icon components (`_ds_bundle.js`).

## Fidelity
High-fidelity: final colors, type and spacing from the Zoodealio design system. Sample data is fictional. The prototype keeps all state in memory; nothing persists.

## Data model
**Deal**: id, address, city/state/zip, agent (name, agency, phone, email), stage (index 0-11), cash offer (number), cash+ offer, lead status (Hot | Warm | Cold | Dead), lastContactAt, followUp (date + time + method + note), notes[] {type: Call|Text|Email|Voicemail|Zoom, createdAt, text}, propertyNotes[] {createdAt, text}.
- **Cash+ offer** is a placeholder in the prototype: Cash x 1.08. Replace with the real stored value.
- **Agent**: derived by grouping deals by agent name in the prototype. Make it a table (name, agency, phone, email) with deals referencing it.
- **Task**: id, title, description (notes), dealId (nullable), date, time, method (Call|Text|Email|Voicemail|Zoom|Task), done, source (Follow-up | Manual).
- **Saved view**: name, rules[] {field, op, value}, sorts[] {key, dir}. Make per-user.

Stages in order: Comping complete, Comping viewed, Agent disputed comps, Details requested, Offer ready, Details shared, Agent countered, Offer selected, Under contract, Inspection period, Closed, Lost / dead.
- Active deals = stages 0-9. Closed (10) and Lost/dead (11) are excluded from dashboard counts and the queue.
- **Stale** = active deal with 7+ days since last contact. Make the threshold a setting.
- Lead status is separate from stage.

## Screens
**Shell.** 232px sticky left sidebar, bg #1c1b1f. Wordmark "Zoodealio" 22px/800 plus "CRM" in #e11d74. Nav items (15px/600, padding 11px 12px, radius 10px, active bg #ac0a55): Dashboard, Leads (active count), Board, Tasks (open count), Agents. Main area bg #f7f7f7, padding 32px 36px.

1. **Dashboard** (default). Greeting "N follow-ups are overdue. N hot leads to work." 4 stat tiles (Hot leads + offer sum, Overdue follow-ups, Stale 7+ days, Under contract + sum); first tile magenta. Tiles open Leads with the matching saved view, or Board. Three cards (Overdue, Today, Stale 7+ days). Each row: full address, agent name, then a note line, with a right-side tag. Click opens the deal.
2. **Leads.** Table columns: checkbox, lead status pill, property/agent (full address, then agent), stage, last contact, offers (Cash and Cash+ stacked). Every header sorts, with an arrow: ↕ idle, ↑/↓ active. Last contact ascending = most recent first.
   - "Filters (n) · Sort (n)" button opens a builder. **Filters** (all must match): Status (Active/Closed/Lost), Lead status, Stage, Days since last contact, Offer (Cash), Follow-up days from today, Agent, free-text search over address/agent. Operators: is / is not; at least / at most / exactly; contains. **Sort**: multiple, applied in order (Lead status, Stage, Last contact, Offer, Follow-up date, Agent, Address), each with its own direction.
   - **Saved views** are chips (All active, Hot only, Stale 7d+, Overdue follow-ups): click to apply, x to delete, "Save as new view" with a name, "Update <view>" when edited, "Clear all".
   - Selecting rows shows a dark bulk bar: Move to next stage, Mark hot, Clear.
   - Right card: Follow-up queue (active deals due within 2 days).
3. **Board.** 12 columns, 252px wide, horizontal scroll. Card: lead status pill, last-contact label, full address, agent, Offers (Cash and Cash+ amounts, compact like $520K).
4. **Deal detail.** Back link. Header card: lead status pills (click to set), contact status, full address as the title (32px/700), outline button "Set next follow up", 12-segment stage bar (click a segment to set stage). Left column: composer (textarea; type chips Call, Text, Email, Voicemail, Zoom; button "Log an exchange"), then the notes feed (newest first). Right column: magenta "Current offers" card (Cash and Cash+), Agent card (name, agency, phone, email, "View all N deals with {first name}"), Next follow-up card (overdue #e11d74, today #b45309), **Property notes** card (textarea, "Save property note", list of saved notes).
5. **Tasks.** Title, "N open", button "+ New task". Groups: Overdue, Today, Upcoming, Completed. Row: checkbox, title, subtitle (address, agent, method), optional description line, date/time (colored by group), source label, x delete. Delete asks "Are you sure you want to delete?" with Cancel / Delete. Clicking the subtitle opens the deal.
6. **Agents.** Search bar (agent name, agency, or property address). Cards show name, agency, matching property addresses when searching by property, deal count, total offers. **Agent profile:** contact info, totals, list of that agent's deals.
7. **Schedule modal** (shared). Opened by "Set next follow up" on a deal or "+ New task". Fields: Deal (new-task mode only: searchable picker, shows top 6 matches by address/agent, selected deal shown as a removable chip; must scale to thousands of deals, so use server-side search), Title, Description, Date, Time, How (Call, Text, Email, Voicemail, Zoom). From a deal it creates a Follow-up task and sets the deal's next follow-up; from Tasks it creates a Manual task. Backdrop click or Cancel closes.

## Interactions & behavior
- Logging an exchange prepends to the feed and resets days since last contact to 0. Empty text is ignored.
- Scheduling a follow-up: deal.followUp = chosen date/time/method/title; adds a task. Completing a task does not currently change the deal's follow-up (decide the rule in the real build).
- Bulk actions apply to the selected rows, then clear the selection.
- Back returns to the originating view.
- Dashboard "today/overdue" use the deal's follow-up date; the real build should read from tasks.

## Colors for status
Lead status pill: Hot bg #fbe6f0 / fg #ac0a55; Warm #fff4e5 / #b45309; Cold #e6f0fe / #1d4ed8; Dead #e4e4e7 / #3f3f46. Pill 12px/700, padding 3px 9px, full radius, 6px dot.
Stage bar: #a1a1aa, #a1a1aa, #f59e0b, #71717a, #3b82f6, #3b82f6, #f59e0b, #e11d74, #ac0a55, #8e0746, #10b981, #3f3f46. Done segments #e8a3c2, current #ac0a55, later #e4e4e7.

## Design tokens
Colors: magenta #ac0a55 (dark #8e0746, bright #e11d74), ink #09090b, charcoal #1c1b1f, gray-700 #3f3f46, gray-500 #71717a, gray-400 #a1a1aa, gray-300 #d4d4d8, border #e4e4e7, bg #f7f7f7, bg-warm #f3f2f0, white #fdfdfd, green #10b981, amber #f59e0b.
Type: Helvetica Neue. Numerics 800, headings 700 at -0.03em, labels 500-600. Sizes used: 12, 13, 14, 15, 18, 24, 26, 32, 36.
Radii 8, 10, 12, 14, 16, 18, 999. Shadows: 0 2px 14px rgba(0,0,0,.04); modal 0 24px 60px rgba(0,0,0,.28). Full list in `design-system/styles.css`.

## Assets
No images. Icon: map-pin from the design system's line-icon set (only used in earlier versions). Components: Button (primary, outline; sizes xs, sm), Badge.

## Suggested backend / production notes
- Tables: deals, agents, notes, property_notes, tasks, saved_views, users. Store dates as real timestamps; derive lastContactAt from the latest note and "stale" from a user setting.
- Server-side filtering, sorting and search for Leads and the deal picker.
- Auth with per-user data and saved views. Audit who logged each note.
- Cash+ offer: store and edit real values; the 8% markup is placeholder.
- Add: create/edit deal form, edit/delete notes, pagination, empty states, loading and error states (not designed yet).
