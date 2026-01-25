# Installer Workflow (Mobile-First)

## The 4-Step Wizard

### Step 1: Upload Documents (📸)
**Goal:** Gather evidence of the water heater change
**User Actions:**
- Snap photo of invoice (for new heater)
- Snap photo of old heater (serial visible)
- Snap photo of heater specs (optional; can enter manually)

**System Actions:**
- Upload to Supabase Storage
- Call `/api/extract` with Claude Vision
- Parse: Make, Model, Power (kW), Serial Number

**Error Handling:**
- If Claude can't read a field, show fallback manual input
- User can correct extracted values (e.g., "AI read 'Ariston', actually 'Vaillant'")

**Success:** User proceeds to Step 2, or goes back to re-snap

---

### Step 2: Confirm Extracted Data (✅)
**Goal:** Verify the AI got the heater specs right
**Data Shown:**
- Make (editable text input)
- Model (editable text input)
- Power (editable number)
- Serial Number (editable text)
- Type: Electric | Gas | Aerothermal (dropdown)

**Validation:**
- All fields required
- Power: 4-30 kW range
- If empty, show error: "Please fill all fields"

**Success:** Proceed to Step 3

---

### Step 3: Energy Baseline (⚡)
**Goal:** Establish the "before" consumption to calculate savings
**User Input:**
- "What is your current annual energy cost?" → €XXX text input
- OR "I'll estimate from heater age" (fallback estimate)

**System Logic:**
- Call `/api/calculate` with:
  - `old_cost_eur` (from user input)
  - `old_heater_type` (gas/electric/hybrid)
  - `new_heater_power_kw` (from Step 2)
  - `new_heater_type` (from Step 2)
  
- Server returns:
  ```json
  {
    "old_kwh_year": 1200,
    "new_kwh_year": 300,
    "savings_kwh": 900,
    "savings_eur": 77.4,
    "is_eligible": true,
    "message": "Great! 75% savings (exceeds 20% minimum)"
  }
  ```

**Validation:**
- If `is_eligible: false` (< 20% savings): Show yellow ⚠️ warning
- Message: "This project may not qualify. Admin can override during review."
- Button: "Continue anyway" or "Go back"

**Display:**
- Animated number counting up: "900 kWh/year savings"
- Big green number: "€77 annual value"

**Success:** Proceed to Step 4

---

### Step 4: Commission Claim (💰)
**Goal:** Installer declares how much they want to earn
**Visual:** Horizontal slider, 0-30%

**Live Updates:**
- Slider position = 15%
  - Total savings: €77
  - Your commission: 15% = €11.55
  - Text: "You earn €11.55 per year"

**Display Options:**
- Show as % (15%)
- Show as €€ (€11.55)
- Show as years-to-break-even (optional math)

**Validation:**
- If > 30%: Slider stops at 30%, show lock icon + "Maximum is 30%"

**Success Actions:**
- Button 1: "Submit for Verification" → Submit project
- Button 2: "Edit Photos" → Go back to Step 1
- Button 3: "Save as Draft" → Save locally (don't submit)

---

## Status Flow (After Submission)

**Status: "Submitted"** (Blue badge)
- Message: "✋ Waiting for our team to review your documents"
- Installer can NOT edit now
- Show estimated review time: "Usually within 24 hours"
- Notification (Email): "Your CAES project has been submitted. You'll be notified when it's approved."

**Status: "Approved"** (Green badge)
- Message: "✅ Your certificates are ready!"
- Email with download links to 4 PDFs
- Button: "View & Download Documents"

**Status: "Changes Requested"** (Orange badge)
- Message: "⚠️ Our team needs clarification"
- Show admin's comment: "Please provide serial number more clearly"
- Button: "Edit & Resubmit"

**Status: "Rejected"** (Red badge)
- Message: "❌ This project doesn't qualify"
- Show reason: "Savings are below 20% threshold"
- Button: "Try another project"

## Key Constraints
- **Mobile-first:** Everything responsive to 320px width
- **Offline support:** Calculations happen client-side (no network needed until upload)
- **Language:** All UI text in Spanish (ES)
- **Accessibility:** Keyboard navigation, >4.5:1 contrast, alt text on images
