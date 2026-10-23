---
description: Pull comping-complete deals assigned to me from DealioDesk into the CRM
---

Sync newly-assigned **Comping Complete** deals from DealioDesk into this CRM.

DealioDesk has no API token we can give the deployed app, so this runs on demand
here instead: you (Claude) already have a working DealioDesk connection and the
CRM's Supabase database, so you do the sync directly.

## Steps

1. **Identify the user.** Call DealioDesk `whoami` to get the current user's id.

2. **Fetch Comping Complete deals.** Call `read_operation` with
   `Transactions.SearchProperties`, params:
   `{"assignedToUserId": "<whoami id>", "phases": ["OffersReady"], "includeDeals": true, "pageSize": 100}`.
   Paginate (`pageNumber`) until all pages are read. Keep only items where
   `deals[0].offersLaneCode === "comping-complete"`.

3. **Resolve the CRM owner.** Query `crm.user_settings` and take the single
   `user_id` — that's whose CRM the deals go into. Use the postgres client with
   `DATABASE_URL` from `.env.local` (same pattern as scripts/migrate).
   - `.env.local` currently points at the **dev** database. To sync into
     **production**, use the production `DATABASE_URL` and confirm with the user
     first — writing to production is a one-way action.

4. **Insert each new deal.** For every matched property, skip it if a row with
   that `dealiodesk_transaction_id` already exists (dedup key). Otherwise:
   - Find-or-create the listing agent by `agentName` (case-insensitive) for this
     user; set `phone` from `agentPhone`.
   - Split `address` (`"Street, City, ST"`) into address / city / state.
   - Map offers from `offerExpirySummary.expiringOffers`:
     **type 0 → `cash_offer`, type 1 → `cash_plus_offer`**.
     (Rationale: single-offer deals always carry type 0, so type 0 is the
     base cash offer and type 1 the optional cash-plus. Confirm with Luis.)
   - Insert into `crm.deals` with `stage = 0`, `lead_status = 'Warm'`,
     the `user_id` from step 3, and `dealiodesk_transaction_id` set.

5. **Report.** Tell the user how many deals were added vs. already present, and
   list the new addresses.

## Notes
- This only imports; it does not change anything in DealioDesk.
- Safe to run repeatedly — the `dealiodesk_transaction_id` dedup means re-runs
  never create duplicates.
