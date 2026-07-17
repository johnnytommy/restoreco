# Google Sheets Booking Backend Setup

Restore Co.'s booking modal saves progress by POSTing JSON straight from the
browser to a Google Apps Script Web App bound to a Google Sheet. This has to
be set up once, by hand, from a Google account you and Deja both have access
to — this part can't be done by Claude, since it needs your Google login.

## 1. Create the Sheet
1. Go to sheets.google.com and create a new spreadsheet, e.g. "Restore Co. Bookings".
2. Leave it empty — the script creates its own "Bookings" tab and header row the first time it runs.

## 2. Add the Apps Script
1. In the Sheet, go to **Extensions → Apps Script**.
2. Delete anything in the editor and paste in the contents of `google-apps-script/Code.gs` from this repo.
3. Save the project (e.g. name it "Restore Co Booking Backend").

## 3. Deploy as a Web App
1. Click **Deploy → New deployment**.
2. Click the gear icon next to "Select type" and choose **Web app**.
3. Set "Execute as" to **Me**, and "Who has access" to **Anyone**.
4. Click **Deploy**, and authorize the script when prompted (it needs permission to edit this Sheet).
5. Copy the **Web app URL** — it looks like `https://script.google.com/macros/s/XXXXXXXX/exec`.

## 4. Wire it into the site
1. Open `app.js`.
2. Replace:
   ```js
   const SHEETS_WEBAPP_URL = 'PASTE_YOUR_APPS_SCRIPT_DEPLOYMENT_URL_HERE';
   ```
   with your copied URL.
3. Reload the site and complete a test booking. Check the Sheet — a row should appear in the "Bookings" tab and update in place as you move through the modal's steps.

## Re-deploying after script edits
Any time you change `Code.gs`, go to **Deploy → Manage deployments**, edit the
existing deployment, and choose "New version" — the Web app URL stays the
same, so `app.js` doesn't need updating again.
