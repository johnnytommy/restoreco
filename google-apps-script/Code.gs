const SHEET_NAME = 'Bookings';
const COLUMNS = [
  'sessionId', 'firstName', 'lastName', 'neighborhood',
  'packageId', 'packageName', 'addonEnabled', 'total',
  'date', 'dayPart', 'intake', 'submittedAt',
];

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
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

  const rowValues = COLUMNS.map(col => (data[col] !== undefined ? data[col] : ''));

  if (rowIndex === -1) {
    sheet.appendRow(rowValues);
  } else {
    sheet.getRange(rowIndex, 1, 1, COLUMNS.length).setValues([rowValues]);
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
