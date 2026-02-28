# CRITICAL RULES - DO NOT MODIFY WITHOUT EXPLICIT USER PERMISSION

## 🎨 UI/UX DESIGN DECISIONS

### Waveform Colors
**NEVER CHANGE THESE COLORS WITHOUT EXPLICIT REQUEST**

- **Waveform color (mini previews):** `rgba(56,189,248,0.9)` - Sky-400 / Cyan
- **Progress color:** `rgba(14,165,233,1)` - Sky-500
- **Static canvas waveform:** `#38bdf8` - Cyan

Location: `public/flow.js`
- Line ~2130: Mini waveform creation
- Line ~2444: Static canvas generation

### Review Buttons Style
**NEVER MODIFY BUTTON STYLES WITHOUT EXPLICIT REQUEST**

Location: `app/globals.css` (lines 2490-2540)

- **"Ho finito di commentare" button:**
  - Background: `var(--surface-2)`
  - Border: `1px solid var(--border)`
  - Height: `38px`
  - Hover: subtle shadow and transform

- **"Approved" button:**
  - Background: `linear-gradient(135deg, #059669 0%, #10b981 100%)`
  - Emerald green with gradient
  - Height: `38px`
  - Font weight: `700`
  - Hover: brighter gradient with shadow

### Button Visibility Rules
**NEVER CHANGE THESE RULES WITHOUT EXPLICIT REQUEST**

For collaborators (non-owners):
- ❌ HIDE: "Start revision" button
- ❌ HIDE: "Richiedi modifiche" button
- ✅ SHOW: "Ho finito di commentare" button
- ✅ SHOW: "Approved" button

Location: `public/flow.js` - `updateReviewUI()` function

## 📧 EMAIL NOTIFICATIONS

### Email Notification System
**NEVER DISABLE OR MODIFY WITHOUT EXPLICIT REQUEST**

Location: `app/api/upload/route.ts` - `notifyCollaborators()` function

When owner uploads a new file to a project with collaborators:
- Email sent to ALL collaborators (members in `project_members` table except uploader)
- Subject: `Nuovo file caricato su "{projectName}"`
- Contains: file name, uploader name, project link
- Runs asynchronously (fire-and-forget)
- A project is considered "shared" if it has members in `project_members` besides the uploader

Template location: `lib/email.ts` - `sendNewVersionNotification()`

## 🔢 REVISION TRACKING

### Max Revisions Display
**NEVER REMOVE THIS INFORMATION WITHOUT EXPLICIT REQUEST**

Location: `public/flow.js` (lines 3786-3792)

Each cue header shows:
```
{version_count} versions · {max_revisions} revisioni
```

Example: "3 versions · 5 revisioni"

This helps collaborators know how many revisions are available.

## 🎯 VERSION STATUS LOGIC

### Extra Revision Marking
**NEVER CHANGE THIS LOGIC WITHOUT EXPLICIT REQUEST**

Location: `public/flow.js` (lines 4061-4068)

After uploading `max_revisions` versions, any additional version is marked as:
- Status: Extra revision (needs payment)
- Color indicator: Red/warning color

Example:
- Max revisions: 3
- Version 1, 2, 3: Normal (included)
- Version 4+: Extra (marked in red, requires payment)

## 🚨 CRITICAL WORKFLOWS

### File Upload Flow
1. Upload file to Supabase storage
2. Generate signed URL
3. **Send email notifications to collaborators** (CRITICAL - DO NOT REMOVE)
4. Return success response

### Waveform Generation
1. Always use WaveSurfer for dynamic waveforms
2. Use static canvas only for stored thumbnails
3. Color MUST be cyan (#38bdf8)

## 📝 NOTES

- These rules were established after multiple iterations and user feedback
- Any modification to these elements requires EXPLICIT user permission
- If in doubt, ASK the user before making changes to these areas

---

**Last updated:** 2026-01-08
**Reason for creation:** To prevent accidental modifications to critical UI/UX decisions and business logic
