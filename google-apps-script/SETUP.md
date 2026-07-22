# Google Sheets Booking Backend Setup

Restore Co.'s booking modal saves progress by POSTing JSON straight from the
browser to a Google Apps Script Web App bound to a Google Sheet. This has to
be set up once, by hand, from a Google account you and Deja both have access
to — this part can't be done by Claude, since it needs your Google login.

## Production vs. dev

`app.js` picks which Sheet to write to based on the hostname the page is
served from: only `restoreco.vercel.app` (the production domain) writes to
the **production** Sheet. Every other host — `localhost`, any Vercel preview
deployment, anything else — writes to a separate **dev** Sheet, so testing
never touches real lead data.

That means you need to run this whole setup **twice**: once for production
(the "Restore Co. Bookings" sheet you likely already have), once for a
second "Restore Co. Bookings (Dev)" sheet with its own Apps Script
deployment. Follow steps 1-3 below for each, then wire both URLs into
`app.js` per step 4.

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
2. For the **production** deployment (`restoreco.vercel.app`), replace:
   ```js
   const SHEETS_WEBAPP_URL_PROD = 'https://script.google.com/macros/s/.../exec';
   ```
   with the Web app URL from your production Sheet's deployment.
3. For the **dev** deployment (localhost, previews, everything else), replace:
   ```js
   const SHEETS_WEBAPP_URL_DEV = SHEETS_WEBAPP_URL_PLACEHOLDER;
   ```
   with the Web app URL from your dev Sheet's deployment (or leave it as-is —
   it'll just warn in the console and skip sending until you set it up).
4. Reload the site (on whichever host you're testing) and complete a test
   booking. Check the matching Sheet — a row should appear in the "Bookings"
   tab and update in place as you move through the modal's steps.

## Re-deploying after script edits
Any time you change `Code.gs`, go to **Deploy → Manage deployments**, edit the
existing deployment, and choose "New version" — the Web app URL stays the
same, so `app.js` doesn't need updating again.
