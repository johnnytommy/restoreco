# Google Sheets Booking Backend Setup

Restore Co.'s booking modal saves progress by POSTing JSON straight from the
browser to a single Google Apps Script Web App bound to a single Google
Sheet. This has to be set up once, by hand, from a Google account you and
Deja both have access to. This part can't be done by Claude, since it needs
your Google login.

## One workbook, two tabs

There is only **one** spreadsheet and **one** Apps Script deployment. The
script writes into one of two tabs in that same workbook, "Prod Bookings" or
"Dev Bookings", based on an `environment` field the site sends with every
request.

`app.js` decides that value from the hostname the page is served from: only
`PROD_HOSTNAME` (see step 4) counts as production. Every other host,
including `localhost` and this project's Vercel deployment, is treated as
dev. Until you've actually launched the official production domain and set
`PROD_HOSTNAME` to match it, `PROD_HOSTNAME` is left as an unmatchable
placeholder, so everything, including the live Vercel URL, writes to Dev
Bookings on purpose.

## 1. Create the Sheet
1. Go to sheets.google.com and create a new spreadsheet, e.g. "Restore Co. Bookings".
2. Leave it empty. The script creates the "Prod Bookings" and "Dev Bookings" tabs and their header rows the first time each is used.

## 2. Add the Apps Script
1. In the Sheet, go to **Extensions → Apps Script**.
2. Delete anything in the editor and paste in the contents of `google-apps-script/Code.gs` from this repo.
3. Save the project (e.g. name it "Restore Co Booking Backend").

## 3. Deploy as a Web App
1. Click **Deploy → New deployment**.
2. Click the gear icon next to "Select type" and choose **Web app**.
3. Set "Execute as" to **Me**, and "Who has access" to **Anyone**.
4. Click **Deploy**, and authorize the script when prompted (it needs permission to edit this Sheet).
5. Copy the **Web app URL**. It looks like `https://script.google.com/macros/s/XXXXXXXX/exec`.

## 4. Wire it into the site
1. Open `app.js`.
2. Set the deployment URL:
   ```js
   const SHEETS_WEBAPP_URL_CONFIGURED = 'https://script.google.com/macros/s/.../exec';
   ```
   to the Web app URL you just copied.
3. Once the official production domain exists, point production traffic at the Prod Bookings tab by replacing:
   ```js
   const PROD_HOSTNAME = PROD_HOSTNAME_PLACEHOLDER;
   ```
   with the real domain, e.g. `const PROD_HOSTNAME = 'restoreco.com';`. Until you do this, every host (including the live Vercel deployment) writes to Dev Bookings, which is the intended behavior while there's no official site yet.
4. Reload the site (on whichever host you're testing) and complete a test
   booking. Check the matching tab in the Sheet, a row should appear and
   update in place as you move through the modal's steps.

## Re-deploying after script edits
Any time you change `Code.gs`, go to **Deploy → Manage deployments**, edit the
existing deployment, and choose "New version". The Web app URL stays the
same, so `app.js` doesn't need updating again.
