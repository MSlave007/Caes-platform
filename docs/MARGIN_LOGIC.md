# Margin & Commission Calculation Logic

## The Dual-Commission Model

### Phase 1: Installer Submission
**The Installer chooses their cut at Step 4 of the wizard**

Total Project Value: €400/year (annual energy savings)

Installer's Choice:
Slider: ████████░░░░ = 25%

Calculation:
Installer wants: €400 × (25% / 100) = €100
Remaining: €400 - €100 = €300

Status: "Submitted" (installer's margin is LOCKED IN)

---

### Phase 2: Admin Review & Approval
**The Admin now chooses their margin (only when approving)**

Same Project, Admin Review Screen:

Current State:
Total Savings: €400
Installer Claimed: €100 (25% locked)
Remaining for Admin: €300

Admin's Margin Slider:
🎚️ ███████████░ = 65% of the €300?
OR
🎚️ ███████░░░░░░ = 75% of the €300?

Calculation:
Admin wants: €300 × (65% / 100) = €195

Final Split:
├─ Installer: €100 (25% of total)
├─ Admin: €195 (48.75% of total)
└─ Reserved/Other: €105 (26.25%)

Status: "Approved" (admin's margin is LOCKED IN)

---

### Edge Cases

**Case 1: Installer Claims Max (30%)**
Total: €400
Installer: €120 (30%)
Remaining: €280

Admin chooses:
0% (take nothing): Remaining €280 goes to... storage?
50%: Admin takes €140
100%: Admin takes €280 (take all remaining)

**Case 2: Project Not Eligible (< 20% savings)**
Total Savings: €80 (only 15% improvement)

Admin Review:
⚠️ Yellow Warning: "Below 20% threshold. Ineligible per BOE."

Admin Options:
- "Request Changes" → Installer resubmits
- "Override & Approve Anyway" → (risky, audit log this)
- "Reject" → Project marked as rejected

If Admin overrides:
- Margin still calculated normally
- Audit log: "OVERRIDE: Admin approved ineligible project"
- Both parties alerted

---

## Database Formulas

### Automatic Calculation (Server-Side)
```typescript
// After admin approves with their margin %

installer_earnings_eur = savings_eur * (installer_margin_percent / 100)
remaining_after_installer = savings_eur - installer_earnings_eur

admin_earnings_eur = remaining_after_installer * (admin_margin_percent / 100)
other_earnings_eur = savings_eur - installer_earnings_eur - admin_earnings_eur
```

### Validation Rules
```typescript
if (installer_margin_percent > 30) {
  throw Error("Installer margin cannot exceed 30%");
}

if (admin_margin_percent > 100) {
  throw Error("Admin margin cannot exceed 100% of remaining");
}

if (savings_eur < (minimum_threshold_eur)) {
  flag_for_manual_review = true;
}
```

### Payment Flow (Future v2)
In MVP (v1): Just calculate and display. No actual payments.

In v2: Integrate with Stripe Connect

Monthly (e.g., Jan 25):
├─ Admin calculated: Revenue = €2,400
├─ Stripe Connect split:
│  ├─ Installer accounts: Each gets their % automatically
│  └─ Admin account: Gets remainder
└─ Both receive emails with breakdown

### Reporting & Transparency

**For Installers**
"Your Earnings Report"
- Total projects submitted: 12
- Total earnings (all time): €1,200
- This month: €350
- Breakdown by project (table)

**For Admins**
"Revenue Dashboard"
- Total projects approved: 45
- Total revenue: €12,400
- Average margin taken: 64%
- This month: €1,200
- Top installers by volume
- Export to CSV for accounting
