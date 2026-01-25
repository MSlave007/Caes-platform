# Admin Workflow (Desktop-First, Control Center)

## Dashboard Overview

### KPI Cards (Top Section)
┌─────────────────┬─────────────────┬─────────────────┐
│ Total Revenue   │ Projects        │ Avg Margin      │
│ This Month      │ Approved        │ Claimed         │
│                 │                 │                 │
│ €8,240          │ 23              │ 68%             │
│ ↑ 12% vs last   │ ↑ +5 since      │                 │
│                 │ yesterday       │                 │
└─────────────────┴─────────────────┴─────────────────┘

### Queue Summary
- Pending Review: 5 projects
- In Progress: 2 projects
- Ready to Approve: 3 projects (all documents valid)
- Rejected: 1 project (needs installer follow-up)

---

## Review Queue (The "Inbox")

### Table/Kanban View
**Columns:**
1. **Installer Name** → Link to installer profile
2. **Project Date** → "Jan 25, 2026"
3. **Client Name** → "Juan Garcia"
4. **Estimated Savings** → "€400/year" (green badge)
5. **Status** → "Submitted" (blue badge) | "Ready" (yellow)
6. **Installer Claim** → "30%" (their commission)
7. **Your Cut** → "€280" (calculated automatically)
8. **Action** → "Review" (button)

**Sorting:**
- By: Newest first | Highest savings | Status
- Filter: By installer | By date range | By status

**Bulk Actions:**
- Select multiple projects → "Approve All" → Generate all PDFs at once

---

## Review Detail View (Split-Screen)

### Left Panel: Document Viewer
┌────────────────────────────────┐
│ Document Gallery               │
│ ┌──────┬──────┬──────────┐     │
│ │ IMG1 │ IMG2 │ IMG3     │     │
│ │  √   │  √   │ ✗ Blurry │     │
│ └──────┴──────┴──────────┘     │
│                                │
│ [Current image displayed large]│
│ Invoice: Ariston, Genus One 24 │
│ Date: Jan 24, 2026             │
│ Power: 24 kW visible           │
└────────────────────────────────┘

**Features:**
- Zoom in/out on image
- Rotate if needed
- Flag if photo quality is poor

### Right Panel: Editable Data Form
┌──────────────────────────────┐
│ Project Data (EDITABLE)      │
├──────────────────────────────┤
│ Heater Make: [Ariston     ] ✓│
│ Heater Model: [Genus One  ] ✓│
│ Power (kW):   [24         ] ✓│
│ Serial:       [SN1234567  ] ✗│
│ Type:         [Aerothermal] ✓│
│                              │
│ Old Consumption: [1200 kWh] ✓│
│ New Type: [Aerothermal]      │
│                              │
├─ CALCULATIONS ─────────────────│
│ Annual Savings: 900 kWh      │
│ € Value: €77.40              │
│ Status: ✅ ELIGIBLE          │
│                              │
├─ MARGINS ──────────────────────│
│ Installer Claims: 30% = €23.22│
│                              │
│ 🎚️ Your Admin Margin:        │
│ [████████░░] 70% = €54.18    │
│                              │
│ Your Earnings: €54.18        │
│                              │
├─ ACTIONS ──────────────────────│
│ [✅ Approve]  [⚠️ Request Info]│
│ [❌ Reject]                  │
└──────────────────────────────┘

**Admin Capabilities:**
1. **Edit Any Field:** If AI misread something
2. **Override Margin:** Change your cut (0-70% slider)
3. **Add Notes:** "Serial number is hard to read but invoice matches"
4. **Request Changes:** Send back to installer with message
5. **Approve & Generate:** Create all 4 PDFs (only option if all green ✅)

---

## Approval Process

### Pre-Approval Checks (Automated)
✅ All documents uploaded?
✅ All extracted fields populated?
✅ Energy savings ≥ 20%?
✅ Installer % ≤ 30%?
✅ Admin margin set?
✅ No obvious fraud flags?

If ANY fail → Show yellow warning, disable "Approve" button

### Approval Action
**Admin clicks "✅ Approve & Generate Certificates"**

**System Action:**
1. Lock the project (no more edits)
2. Call `/api/documents/generate` with:
   - Project ID
   - Admin margin %
   - Installer commission %
3. Generate 4 PDFs:
   - CAES Agreement (Convegno CAE)
   - RES 60 Certificate
   - Annex 1 (Client Summary)
   - Installation Summary
4. Save PDFs to Supabase Storage
5. Create audit log entry: "Approved by [Admin Name] on [Date/Time]"
6. Change status → "Approved"
7. Send emails:
   - To Installer: "Your project approved. Download: [URL]"
   - To Client: "Your energy certificate: [URL]"
   - To Admin: Confirmation + audit log

**Admin Sees:**
- Toast notification: "✅ Project approved! Documents generated."
- Project moves to "Completed" section
- Update revenue calc: "+€54.18 to your account"

---

## Batch Operations

### "Approve All Ready" Button
**Scenario:** You have 5 projects in "Ready to Approve" status
**Action:** Click button
**System:** Generates all 5 PDFs + sends all emails in parallel
**Time:** ~2 minutes instead of 10 minutes (5 × manual clicks)

### Export (Admin Only)
- **Export As:** CSV, Excel, PDF report
- **Data Included:** Installer name, project date, savings, margin split, status
- **Use Case:** Monthly reporting to stakeholders

---

## Audit Log (Compliance Trail)

**Every action is logged:**
Jan 25, 2:30 PM | Admin "Maria Lopez" | Approved project "Garcia Heater"
| Before: "submitted" | After: "approved"
| Margin set to: 65%
| Documents generated: 4 files

Jan 25, 2:15 PM | Admin "Maria Lopez" | Edited field "Serial Number"
| Before: "SN123" | After: "SN1234567"

Jan 25, 2:00 PM | Installer "Juan Perez" | Submitted project
| Status changed to: "submitted"

**Exports:**
- Download audit log as CSV (for compliance audits)
- Filter by: Date range, admin name, project status

---

## Key Admin Rules
- **Rule 1:** Cannot approve until all ✅ fields are green
- **Rule 2:** Cannot set margin > 70% of savings (leaves installer something)
- **Rule 3:** Cannot edit a project after approval (only view)
- **Rule 4:** All actions logged + timestamped
- **Rule 5:** Email proof of approval sent automatically
