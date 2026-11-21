# Elevate Dashboard: setup guide

The dashboard runs on Google Apps Script inside your **Elevate Learners** Google Sheet.
It takes about 10 minutes, once. Use a computer, not a phone, for the setup.

## What you get

- Every inquiry, online enrollment and quiz result from the student portal is saved to the sheet.
- Online enrollments arrive as **Applied**, with the payment option and method, and links to the
  learner's QID photos. The photos are stored in a private Google Drive folder that only you can open
  ("Elevate Learners - ID documents (private)", created automatically).
- A private dashboard that only your Google account can open, with:
  - learners, course records, enrollments, conversion rate and repeat enrollees
  - status for each course: Inquired, Contacted, Visited, Applied, Enrolled, Follow-up, Not interested
  - lead source (School-provided, Social media, Direct, Referral) and counsellor
  - add learners yourself, and add more courses to an existing learner
  - a contact history (calls, WhatsApp, emails, visits, meetings, notes) with "last contacted"
  - follow-up reminders and learners not contacted in 14 days or more
- An email to you whenever a new inquiry arrives.

## Step 1: Add the code to your sheet

1. Open the **Elevate Learners** sheet in Google Drive.
2. Click **Extensions → Apps Script**. A new tab opens.
3. At the top left, click **Untitled project** and rename it **Elevate Dashboard**.
4. In the file list on the left you'll see **Code.gs**. Click it, select everything in the editor, and delete it.
5. Open [Code.gs on GitHub](https://github.com/learnovateqa/elevatewithmsmaria/blob/main/dashboard/Code.gs),
   click the **Copy raw file** button (two overlapping squares, top right of the code), and paste it into the editor.
6. Next to **Files**, click **＋ → HTML**. Name it exactly `Dashboard` (Apps Script adds `.html`).
   Delete what's in it, then copy and paste
   [Dashboard.html from GitHub](https://github.com/learnovateqa/elevatewithmsmaria/blob/main/dashboard/Dashboard.html) the same way.
7. Click the **Save** icon (💾).

## Step 2: Give permission (one time)

1. In the toolbar, choose the function **setup** from the dropdown, then click **Run**.
2. Click **Review permissions** and choose your Google account.
3. Google shows "Google hasn't verified this app". That's expected, because this is your own script.
   Click **Advanced → Go to Elevate Dashboard (unsafe) → Allow**.
4. The log at the bottom should say **Setup OK**.

The script asks to manage your spreadsheets (to save learners), send email as you (for new-inquiry alerts),
see and create files in your Google Drive (to store QID photos in your private folder), and connect to an
external service (so the portal can send it inquiries). Running **setup** also creates the private ID folder.

## Step 3: Create the inquiry receiver (for the portal)

1. Click **Deploy → New deployment**.
2. Click the gear ⚙ next to "Select type" and choose **Web app**.
3. Description: `Inquiry receiver`
4. Execute as: **Me**
5. Who has access: **Anyone**
6. Click **Deploy**, then copy the **Web app URL** (it ends in `/exec`).
7. **Send this URL to Claude** (or paste it into `INQUIRY_ENDPOINT` in `index.html`). Until it's added,
   the portal still works, but inquiries aren't saved to the sheet.

"Anyone" is needed so students can submit the form without a Google account. This URL can only *add*
inquiries; it never shows any data.

## Step 4: Create your private dashboard

1. Click **Deploy → New deployment** again, and choose **Web app**.
2. Description: `Dashboard`
3. Execute as: **Me**
4. Who has access: **Only myself**
5. Click **Deploy** and copy this second **Web app URL**. This is your dashboard.
6. Open it and bookmark it. On your phone, open it in Chrome or Safari and use
   **Add to Home Screen** so it works like an app.

The grey bar at the top saying "This application was created by a Google Apps Script user" is normal.

Keep the dashboard link to yourself. Even if someone else gets it, Google will ask them to sign in,
and the dashboard only opens for the account that owns the sheet.

## Everyday tips

- **Add counsellors:** type their names in the **Lists** tab, column C. The first name is the default.
- **Add lead sources or contact types:** add them to the **Lists** tab (columns B and D).
- **Statuses:** you can add new ones in column A, but don't rename the existing seven. The colours
  and reports use those names.
- **Editing in the sheet:** you can also edit the **Enrollments** tab directly. Don't change the
  Record ID or Learner ID columns, and don't type in the grey formula columns (Last contacted,
  and everything in the Learner directory and Summary tabs).
- **Payment methods:** the choices students see (cash at the office, bank transfer, card) are listed in
  `index.html` (the enrollment form) and `PAY_METHODS` in `Dashboard.html`. Ask Claude to change them.
- **Reviewing an application:** open the learner, check the QID link, confirm payment, then set the status
  to **Enrolled** (the enrolled date fills in automatically).
- **Privacy:** the sheet and the ID folder hold students' personal details and ID copies. Don't share it, and only add people
  you trust as editors.

## If you set up the dashboard before online enrollment was added

Paste the new Code.gs and Dashboard.html, run **setup** once more and allow the new Google Drive
permission, then update both deployments as described below.

## When the code is updated later

The links stay the same when you update:

1. Replace the contents of **Code.gs** and/or **Dashboard.html** in Apps Script with the new version, then save.
2. Click **Deploy → Manage deployments**. For **each** deployment (Inquiry receiver and Dashboard):
   click the pencil ✎, set **Version** to **New version**, and click **Deploy**.

## Troubleshooting

| Problem | Fix |
|---|---|
| Dashboard says "Private page" | Open it while signed in to the Google account that owns the sheet. If you use several Google accounts in the same browser, open the link in a private window and sign in with that account only. |
| "Not authorised" message | Same as above. |
| Inquiries don't appear in the sheet | Check that the **Inquiry receiver** URL is in `INQUIRY_ENDPOINT` in `index.html`, and that its access is **Anyone**. |
| "The 'Enrollments' tab is missing" | A tab was renamed. Tab names must be: Enrollments, Learner directory, Contact log, Summary, Quiz results, Lists. |
| No email alerts | Run **setup** again and allow the permissions. Alerts can be turned off by setting `NOTIFY_NEW_INQUIRIES: false` at the top of Code.gs. |
