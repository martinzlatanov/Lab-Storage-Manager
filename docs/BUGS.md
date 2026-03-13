# Bug Report — Lab Storage Manager Frontend

> Generated: 2026-03-13
> Scope: Frontend UI (mock data phase, pre-backend)
> Tester: QA audit (AI-assisted full read of all source files)

---

## How to use this file

Each bug has:
- **File + line** — exact location
- **Problem** — what is wrong and why
- **Fix** — specific change needed

Bugs are ordered by severity: Critical → High → Medium → Low.

---

## CRITICAL

---

### BUG-001 — Route conflict: `/items/:id` matches before `/items/new/:type`

**File:** `frontend/src/App.tsx` — lines 48–49
**Severity:** Critical

**Problem:**
Routes are declared in this order:
```tsx
<Route path="/items/:id" element={<ItemDetailPage />} />
<Route path="/items/new/:type" element={<AddItemPage />} />
```
React Router v6 matches routes in declaration order. When the user navigates to `/items/new/electronics`, the segment `new` is matched as the `:id` parameter, so `ItemDetailPage` is rendered instead of `AddItemPage`. The "Add Item" feature is completely inaccessible — every link from the "Add Item" dropdown opens a detail page that shows "Item not found."

**Fix:**
Swap the order so the more specific route comes first:
```tsx
<Route path="/items/new/:type" element={<AddItemPage />} />
<Route path="/items/:id" element={<ItemDetailPage />} />
```

---

## HIGH

---

### BUG-002 — All form inputs in `AddItemPage` are uncontrolled — data is lost on submit

**File:** `frontend/src/pages/items/AddItemPage.tsx` — lines 44–239
**Severity:** High

**Problem:**
Every sub-form component (`ElectronicsForm`, `FixtureForm`, `SparePartForm`, `ConsumableForm`, `MiscForm`) renders `<input>` and `<textarea>` elements with no `value` or `onChange` binding. They are fully uncontrolled.

The `handleSubmit` function (lines 249–256) does not read any form values — it just fakes a delay and navigates to `/items`:
```tsx
function handleSubmit(e: React.FormEvent) {
  e.preventDefault()
  setSaving(true)
  setTimeout(() => {
    setSaving(false)
    navigate('/items')   // no data captured or saved
  }, 1000)
}
```

The Storage Location section (lines 282–302) also has uncontrolled `<select>` elements.

The only exception is `FixtureForm`, which correctly manages `selectedTypes` state for the fixture-type toggle buttons — but that state is also never passed back to the parent.

**Fix:**
Each sub-form needs to lift its state to `AddItemPage` or use a form library. The simplest approach is to use `useRef` on the `<form>` element and read `FormData` on submit, or to add `useState` for each field. All field values must be passed to `handleSubmit` so they can later be sent to the API.

The `FixtureForm` `selectedTypes` state also needs to be lifted to the parent so it survives the submit cycle.

---

### BUG-003 — Overdue detection is hardcoded to `item.id === 'item3'`

**Files:**
- `frontend/src/pages/operations/OperationsPages.tsx` — line 342
- `frontend/src/pages/dashboard/DashboardPage.tsx` — line ~143 (overdue items section)
- `frontend/src/pages/reports/ReportsPages.tsx` — lines ~95, ~133
- `frontend/src/pages/storage/StoragePages.tsx` — line ~323

**Severity:** High

**Problem:**
Overdue status is determined by a hardcoded ID check:
```tsx
const isOverdue = selectedItem?.id === 'item3' // mock
```
This means:
- Only `item3` will ever show the overdue warning in `ReturnPage`.
- The External report and Dashboard overdue section also use this same logic.
- When the backend is connected, no real item will match `item3`, so overdue detection will silently stop working for all items.

**Fix:**
Replace with a real date comparison. Items on temporary exit have an `expectedReturnDate` field in the mock data. The correct check is:
```tsx
const isOverdue =
  selectedItem?.status === ItemStatus.TEMP_EXIT &&
  selectedItem?.expectedReturnDate != null &&
  new Date(selectedItem.expectedReturnDate) < new Date()
```
Apply the same logic consistently in all four locations listed above.

---

### BUG-004 — Operation pages capture no form data (Move, Exit, Return, Scrap)

**File:** `frontend/src/pages/operations/OperationsPages.tsx`
**Severity:** High

**Problem:**
The following operation forms have uncontrolled inputs — their values are never read on submit:

| Page | Uncontrolled fields |
|---|---|
| `MovePage` (lines 241–264) | Destination location `<select>`, destination container `<select>`, notes `<textarea>` |
| `ExitPage` (lines 306–319) | External location `<select>`, expected return date `<input type="date">`, notes `<textarea>` |
| `ReturnPage` (lines 377–394) | Return location `<select>`, container `<select>`, notes `<textarea>` |
| `ScrapPage` (lines 453–455) | Scrap reason `<textarea>` |

All four `handleSubmit` functions follow the same broken pattern:
```tsx
function handleSubmit(e: React.FormEvent) {
  e.preventDefault()
  setSubmitting(true)
  setTimeout(() => { setSubmitting(false); navigate('/items') }, 1000)
  // no values read, no operation recorded
}
```

`ConsumePage` is the only operation page that correctly controls its inputs (`selectedItemId` and `qty` are both in state).

**Fix:**
Add `useState` for each field in each operation page and wire up `value` + `onChange`. On submit, pass the captured values to the (future) API call. Until the backend exists, at minimum log them to console or store in local state so the flow can be tested end-to-end.

---

## MEDIUM

---

### BUG-005 — `selected` attribute on `<option>` elements (React anti-pattern, broken in production)

**File:** `frontend/src/pages/admin/AdminPages.tsx` — lines 77–78
**Severity:** Medium

**Problem:**
The role edit `<select>` in `UserManagementPage` uses the HTML4 `selected` attribute directly on `<option>` elements:
```tsx
<select className="...">
  <option value={UserRole.VIEWER}>Viewer</option>
  <option value={UserRole.USER} selected={user.role === UserRole.USER}>User</option>
  <option value={UserRole.ADMIN} selected={user.role === UserRole.ADMIN}>Admin</option>
</select>
```
React ignores the `selected` prop on `<option>`. The select will always show the first option ("Viewer") regardless of the user's actual role. This also triggers a React warning in the console.

Additionally, the select has no `onChange` handler, so even if the user changes the role, the value is not captured. The "Save" button (line 97) calls `setEditingId(null)` and discards the change.

**Fix:**
Add a state variable to track the edited role and use a controlled `<select>`:
```tsx
// Add state: const [editingRole, setEditingRole] = useState<UserRole>(user.role)
<select
  value={editingRole}
  onChange={e => setEditingRole(e.target.value as UserRole)}
  className="..."
>
  <option value={UserRole.VIEWER}>Viewer</option>
  <option value={UserRole.USER}>User</option>
  <option value={UserRole.ADMIN}>Admin</option>
</select>
```
The Save button must then persist `editingRole`.

---

### BUG-006 — "Add Item" dropdown is hover-only — keyboard inaccessible

**File:** `frontend/src/pages/items/ItemListPage.tsx` — lines 103–126
**Severity:** Medium

**Problem:**
The dropdown that lets users pick an item type before creating an item uses Tailwind's `group-hover:block`:
```tsx
<div className="relative group">
  <button ...>Add Item <ChevronDown /></button>
  <div className="... hidden group-hover:block z-20">
    {/* links to /items/new/electronics etc */}
  </div>
</div>
```
This dropdown is completely inaccessible via keyboard. A user pressing Tab to reach the button and then Enter/Space cannot open the dropdown. Tab navigation also causes the dropdown to disappear immediately as focus moves to the next element inside it.

**Fix:**
Replace the CSS hover trick with a controlled state:
```tsx
const [open, setOpen] = useState(false)
// Toggle on button click, close on outside click or Escape key
```
Show/hide using `{open && <div>...</div>}`. Add `onBlur` / `useRef` + click-outside detection or use a `<details>` element for a zero-JS approach.

---

### BUG-007 — `ExitPage` `ItemSearchBox` has no `onSelect` handler — selected item is silently discarded

**File:** `frontend/src/pages/operations/OperationsPages.tsx` — line 302
**Severity:** Medium

**Problem:**
`ExitPage` renders `ItemSearchBox` without an `onSelect` prop:
```tsx
<ItemSearchBox />   // no onSelect
```
When a user scans or types an item and selects it from the dropdown, nothing happens — the selection is never stored. The page proceeds to submit without knowing which item is being exited. `ReturnPage` (line 360) and `MovePage` (line 228) correctly pass `onSelect={setSelectedItemId}`.

**Fix:**
Add state and wire up the handler:
```tsx
const [selectedItemId, setSelectedItemId] = useState('')
// ...
<ItemSearchBox onSelect={setSelectedItemId} />
```
Then use `selectedItemId` to validate the form (disable submit if empty) and pass it to the API.

---

### BUG-008 — `ConsumePage` allows submitting a quantity greater than current stock

**File:** `frontend/src/pages/operations/OperationsPages.tsx` — lines 545–553
**Severity:** Medium

**Problem:**
The quantity input has `max={selectedItem?.quantity}`, which adds a browser-side hint, but the submit button's disabled check does not validate against it:
```tsx
disabled={!selectedItem || !qty || isNaN(qtyNum) || qtyNum <= 0 || submitting}
```
The condition `qtyNum > selectedItem.quantity` is missing. A user can manually type a value higher than available stock (or bypass the `max` attribute via DevTools) and submit the form. The UI correctly shows "Will be depleted" when the result goes ≤ 0, but it does not block submission.

**Fix:**
Add the over-consume check to the disabled condition:
```tsx
disabled={
  !selectedItem || !qty || isNaN(qtyNum) || qtyNum <= 0 ||
  qtyNum > (selectedItem?.quantity ?? 0) ||
  submitting
}
```

---

### BUG-009 — `ItemListPage` status filter omits `SCRAPPED` option, creates confusing UX

**File:** `frontend/src/pages/items/ItemListPage.tsx` — lines 78–89
**Severity:** Medium

**Problem:**
The status filter dropdown lists three statuses:
```tsx
<option value={ItemStatus.IN_STORAGE}>In Storage</option>
<option value={ItemStatus.TEMP_EXIT}>Temp Exit</option>
<option value={ItemStatus.DEPLETED}>Depleted</option>
```
`SCRAPPED` is absent. If a user enables "Show scrapped" but then tries to filter to show *only* scrapped items, they cannot. They also cannot combine a type filter with scrapped-only view.

**Fix:**
Add a `SCRAPPED` option to the status filter dropdown. When `statusFilter === ItemStatus.SCRAPPED`, automatically set `showScrapped = true` so scrapped items are not hidden by the separate flag.

---

## LOW

---

### BUG-010 — Invalid `:type` param in `AddItemPage` defaults silently to `electronics`

**File:** `frontend/src/pages/items/AddItemPage.tsx` — line 246
**Severity:** Low

**Problem:**
```tsx
const formType = (type as ItemFormType) ?? 'electronics'
const title = FORM_TITLES[formType] ?? 'Add Item'
```
If someone navigates to `/items/new/banana`, `formType` becomes `'banana'` (a cast, not validated). `FORM_TITLES['banana']` returns `undefined`, so `title` becomes `'Add Item'`. The rendered form is empty because none of the `{formType === 'X' && <XForm />}` conditions match, leaving the user staring at a blank card with no explanation.

**Fix:**
Validate `type` against the known set of form types:
```tsx
const VALID_TYPES: ItemFormType[] = ['electronics', 'fixture', 'sparepart', 'consumable', 'misc']
const formType: ItemFormType = VALID_TYPES.includes(type as ItemFormType)
  ? (type as ItemFormType)
  : 'electronics'
```
Or redirect to `/items` if `type` is invalid.

---

### BUG-011 — Tab components on `LabelsPage` lack ARIA roles

**File:** `frontend/src/pages/LabelsPage.tsx` — lines 49–62
**Severity:** Low

**Problem:**
The item-type tab strip uses plain `<button>` elements with no ARIA attributes:
```tsx
<button onClick={() => setActiveTab('electronics')}>Electronics</button>
```
Screen readers announce these as generic buttons, not as tabs. The tab panel has no `role="tabpanel"` or `aria-labelledby`. This breaks assistive technology compatibility.

**Fix:**
Add `role="tablist"` to the container, `role="tab"` + `aria-selected` to each button, and `role="tabpanel"` + `aria-labelledby` to the content area.

---

### BUG-012 — No Error Boundary anywhere in the component tree

**File:** `frontend/src/App.tsx`
**Severity:** Low

**Problem:**
There are no React Error Boundaries. If any page component throws a runtime error (e.g., accessing a property on `undefined` from mock data), the entire app unmounts and the user sees a blank white screen with no recovery path.

**Fix:**
Wrap `<AppShell />` (or individual route groups) with an error boundary component:
```tsx
<ErrorBoundary fallback={<ErrorPage />}>
  <Route element={<AppShell />}>
    ...
  </Route>
</ErrorBoundary>
```
React 19 has a built-in `<ErrorBoundary>` component, or a small class component can be written manually.

---

### BUG-013 — `ReceiptPage` step 1 `ItemSearchBox` has no `onSelect` handler

**File:** `frontend/src/pages/operations/OperationsPages.tsx` — line 135
**Severity:** Low

**Problem:**
When the user uses the search box in step 1 of Receipt to find an existing item, the selection is not stored — `ItemSearchBox` is rendered without `onSelect`:
```tsx
<ItemSearchBox />   // no onSelect
```
After selecting an item in step 1, proceeding to step 2 has no knowledge of which item was selected. The receipt is essentially always for a new item.

**Fix:**
Add `useState` for `selectedItemId` in `ReceiptPage` and pass it:
```tsx
const [selectedItemId, setSelectedItemId] = useState('')
<ItemSearchBox onSelect={setSelectedItemId} />
```
Show the selected item's details in step 2 and carry the ID through to the confirmation step.

---

### BUG-014 — `MovePage` container options have no `value` attributes

**File:** `frontend/src/pages/operations/OperationsPages.tsx` — lines 255–259
**Severity:** Low

**Problem:**
The destination container `<select>` has options without `value` attributes:
```tsx
<option>BOX-0001</option>
<option>BOX-0002</option>
<option>BOX-0006 (Munich)</option>
```
When no `value` is set, the form submission value equals the option's text content (e.g. `"BOX-0006 (Munich)"`), not a container ID. This makes reliable API integration impossible.

**Fix:**
Add proper `value` attributes with container IDs matching the mock data:
```tsx
<option value="c1">BOX-0001</option>
<option value="c2">BOX-0002</option>
<option value="c6">BOX-0006 (Munich)</option>
```

---

## Summary

| ID | Severity | File | Description |
|---|---|---|---|
| BUG-001 | Critical | `App.tsx:48` | Route conflict — `/items/:id` shadows `/items/new/:type` |
| BUG-002 | High | `AddItemPage.tsx:44–239` | All form inputs uncontrolled — data lost on submit |
| BUG-003 | High | `OperationsPages.tsx:342` + 3 others | Overdue detection hardcoded to `id === 'item3'` |
| BUG-004 | High | `OperationsPages.tsx` (4 pages) | Move/Exit/Return/Scrap submit nothing |
| BUG-005 | Medium | `AdminPages.tsx:77` | `selected` on `<option>` — React anti-pattern, role not shown or saved |
| BUG-006 | Medium | `ItemListPage.tsx:103` | Add Item dropdown is hover-only, keyboard inaccessible |
| BUG-007 | Medium | `OperationsPages.tsx:302` | ExitPage `ItemSearchBox` missing `onSelect` |
| BUG-008 | Medium | `OperationsPages.tsx:577` | Consume allows quantity > stock |
| BUG-009 | Medium | `ItemListPage.tsx:78` | Status filter missing SCRAPPED option |
| BUG-010 | Low | `AddItemPage.tsx:246` | Invalid `:type` param renders blank form silently |
| BUG-011 | Low | `LabelsPage.tsx:49` | Tab buttons missing ARIA roles |
| BUG-012 | Low | `App.tsx` | No Error Boundary — blank screen on any runtime error |
| BUG-013 | Low | `OperationsPages.tsx:135` | ReceiptPage step 1 search has no `onSelect` |
| BUG-014 | Low | `OperationsPages.tsx:255` | MovePage container options missing `value` attributes |

**Recommended fix order:** BUG-001 → BUG-002 → BUG-004 → BUG-003 → BUG-007 → BUG-013 → BUG-005 → rest
