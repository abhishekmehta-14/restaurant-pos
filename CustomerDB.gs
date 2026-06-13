// FFC & Pizza — Customer Database API
// Deploy as: Web App → Anyone → Execute as Me
// Paste the deployment URL into POS Settings → Customer DB URL

const SHEET_NAME = 'Sheet1'; // Change if your sheet tab has a different name

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME);

    // Add headers if sheet is empty
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['Date', 'Time', 'Order #', 'Name', 'Phone', 'Type', 'Total (₹)', 'Payment', 'Items']);
      sheet.getRange(1, 1, 1, 9).setFontWeight('bold').setBackground('#2C2C2E').setFontColor('#FFFFFF');
    }

    // Check if phone already exists — update visit count
    const existing = findByPhone(sheet, data.phone);
    
    sheet.appendRow([
      data.date,
      data.time,
      data.orderId,
      data.name || 'Guest',
      data.phone || '',
      data.type,
      data.total,
      data.payment,
      data.items
    ]);

    // Auto-resize columns
    sheet.autoResizeColumns(1, 9);

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok', existing: !!existing }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function findByPhone(sheet, phone) {
  if (!phone) return null;
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][4]) === String(phone)) return { row: i + 1, data: data[i] };
  }
  return null;
}

// GET: look up customer by phone
function doGet(e) {
  try {
    const phone = e.parameter.phone;
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME);
    const found = findByPhone(sheet, phone);
    if (!found) return ContentService.createTextOutput(JSON.stringify({ found: false })).setMimeType(ContentService.MimeType.JSON);
    
    // Count visits and total spend for this phone
    const all = sheet.getDataRange().getValues();
    let visits = 0, spend = 0;
    all.forEach((row, i) => {
      if (i > 0 && String(row[4]) === String(phone)) {
        visits++;
        spend += parseFloat(row[6]) || 0;
      }
    });
    
    return ContentService
      .createTextOutput(JSON.stringify({
        found: true,
        name: found.data[3],
        phone: found.data[4],
        visits,
        totalSpend: spend,
        firstVisit: found.data[0]
      }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ found: false })).setMimeType(ContentService.MimeType.JSON);
  }
}
