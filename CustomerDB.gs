const SHEET_NAME = 'Cust_DB';
const SPREADSHEET_ID = '1twHupX80KeX2FYW0Dnlld52dvVBV2PFUS7F1xgZvJis';

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents || e.postData.getDataAsString());
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME);
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['Date','Time','Order #','Name','Phone','Type','Total (₹)','Payment','Items']);
      sheet.getRange(1,1,1,9).setFontWeight('bold').setBackground('#1a1a2e').setFontColor('#ffffff');
    }
    sheet.appendRow([data.date,data.time,data.orderId,data.name||'Guest',data.phone||'',data.type,data.total,data.payment,data.items]);
    return ContentService.createTextOutput(JSON.stringify({status:'ok'})).setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({status:'error',message:err.message})).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    const phone = e.parameter.phone;
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME);
    const all = sheet.getDataRange().getValues();
    let visits=0, spend=0, name='';
    all.forEach((row,i)=>{
      if(i>0 && String(row[4])===String(phone)){
        visits++; spend+=parseFloat(row[6])||0; if(!name)name=row[3];
      }
    });
    if(!visits) return ContentService.createTextOutput(JSON.stringify({found:false})).setMimeType(ContentService.MimeType.JSON);
    return ContentService.createTextOutput(JSON.stringify({found:true,name,visits,totalSpend:spend})).setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({found:false})).setMimeType(ContentService.MimeType.JSON);
  }
}
