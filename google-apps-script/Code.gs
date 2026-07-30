const SHEET_NAME = 'Bookings';
const COLUMNS = [
  'sessionId', 'firstName', 'lastName', 'email', 'zip',
  'packageId', 'packageName', 'curationAddon', 'consultOnly', 'total',
  'weekdayAvailability', 'weekendAvailability', 'intake', 'submittedAt',
];

// Free-text fields the user can type directly; these must be escaped before being written to the
// Sheet so a value like "=IMPORTXML(...)" isn't interpreted as a formula (formula injection).
const FREE_TEXT_COLUMNS = ['firstName', 'lastName', 'email', 'zip'];

function escapeFormulaInjection(value) {
  if (typeof value === 'string' && value.length > 0 && /^[=+\-@]/.test(value)) {
    return "'" + value;
  }
  return value;
}

function doGet() {
  return ContentService.createTextOutput('Restore Co. booking backend is running.');
}

function doPost(e) {
  let data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: 'invalid JSON' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sheet = getSheet();
    const rows = sheet.getDataRange().getValues();
    const sessionIdCol = COLUMNS.indexOf('sessionId');

    let rowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][sessionIdCol] === data.sessionId) {
        rowIndex = i + 1; // 1-indexed, matches getRange
        break;
      }
    }

    const rowValues = COLUMNS.map(col => {
      const value = data[col] !== undefined ? data[col] : '';
      return FREE_TEXT_COLUMNS.indexOf(col) !== -1 ? escapeFormulaInjection(value) : value;
    });

    if (rowIndex === -1) {
      sheet.appendRow(rowValues);
    } else {
      sheet.getRange(rowIndex, 1, 1, COLUMNS.length).setValues([rowValues]);
    }
  } finally {
    lock.releaseLock();
  }

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(COLUMNS);
  }
  return sheet;
}
