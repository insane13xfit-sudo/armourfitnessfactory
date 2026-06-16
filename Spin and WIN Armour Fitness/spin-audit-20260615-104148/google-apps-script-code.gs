function doGet(e) {
  e = e || { parameter: {} };
  const action = (e.parameter && e.parameter.action) ? e.parameter.action.toString().toLowerCase() : '';
  
  // Route GET requests based on action parameter
  if (action === 'status') {
    return doStatus();
  } else if (action === 'verify') {
    return doVerify(e);
  } else if (action === 'get') {
    return doRetrieve(e);
  }
  
  // Default: treat as data write request
  return handleRequest(e.parameter || {});
}

function doPost(e) {
  e = e || { parameter: {} };
  return handleRequest(e.parameter || {});
}

function handleRequest(params) {
  try {
    const spreadsheetId = '1iwTkqe6kuJjP1frA88cA4vDzmdrBsygwj7lujljhTrQ';
    const ss = SpreadsheetApp.openById(spreadsheetId);
    let sheet = ss.getSheetByName('Sheet1');
    if (!sheet) {
      sheet = ss.getSheets()[0];
      if (!sheet) {
        throw new Error('No sheet found in the spreadsheet.');
      }
    }

    const expectedHeaders = ['recordType','fullName','mobile','age','gender','fitnessGoal','currentWeight','targetWeight','experience','startDate','contactMethod','wonOffer','rewardCode','spinId','timestamp'];
    const headerMap = ensureHeaders(sheet, expectedHeaders);

    const recordType = (params.type || params.recordType || 'lead').toString().toLowerCase();
    const fullName = params.fullName || '';
    const mobileValue = String(params.mobile || '').replace(/\D/g, '');
    const age = params.age || '';
    const gender = params.gender || '';
    const fitnessGoal = params.fitnessGoal || '';
    const currentWeight = params.currentWeight || '';
    const targetWeight = params.targetWeight || '';
    const experience = params.experience || '';
    const startDate = params.startDate || '';
    const contactMethod = params.contactMethod || '';
    // Accept the live field names and older aliases, then fill missing win values safely.
    const wonOffer = params.wonOffer || params.offer || params.prize || (recordType === 'win' ? 'Reward' : '');
    const rewardCode = params.rewardCode || params.code || params.couponCode || (recordType === 'win' ? generateRewardCode(wonOffer) : '');
    const receivedSpinId = params.spinId || '';
    let spinId = receivedSpinId;
    if (recordType === 'win' && !spinId) {
      spinId = generateSheetSpinId();
    }
    if (recordType === 'win' && spinId && !receivedSpinId) {
      spinId = ensureUniqueSpinId(sheet, headerMap, spinId);
    }
    let timestamp;
    if (params.timestamp) {
      const parsedTimestamp = new Date(params.timestamp);
      timestamp = isNaN(parsedTimestamp.getTime()) ? new Date().toISOString() : parsedTimestamp.toISOString();
    } else {
      timestamp = new Date().toISOString();
    }

    const row = [];
    expectedHeaders.forEach(header => {
      switch (header) {
        case 'recordType': row.push(recordType); break;
        case 'fullName': row.push(fullName); break;
        case 'mobile': row.push(mobileValue); break;
        case 'age': row.push(age); break;
        case 'gender': row.push(gender); break;
        case 'fitnessGoal': row.push(fitnessGoal); break;
        case 'currentWeight': row.push(currentWeight); break;
        case 'targetWeight': row.push(targetWeight); break;
        case 'experience': row.push(experience); break;
        case 'startDate': row.push(startDate); break;
        case 'contactMethod': row.push(contactMethod); break;
        case 'wonOffer': row.push(wonOffer); break;
        case 'rewardCode': row.push(rewardCode); break;
        case 'spinId': row.push(spinId); break;
        case 'timestamp': row.push(timestamp); break;
        default: row.push('');
      }
    });

    if (recordType === 'lead' && mobileValue) {
      const data = sheet.getDataRange().getValues();
      for (let i = data.length - 1; i >= 1; i -= 1) {
        const rowType = (data[i][headerMap.recordtype - 1] || '').toString().toLowerCase();
        const rowMobile = String(data[i][headerMap.mobile - 1] || '').replace(/\D/g, '');
        if (rowType === 'lead' && rowMobile === mobileValue) {
          sheet.getRange(i + 1, 1, 1, row.length).setValues([row]);
          return ContentService
            .createTextOutput('SUCCESS_UPDATED_LEAD')
            .setMimeType(ContentService.MimeType.TEXT);
        }
      }
    }

    if (recordType === 'win') {
      const data = sheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i += 1) {
        const rowSpinId = String(data[i][headerMap.spinid - 1] || '').trim();
        const rowRecordType = (data[i][headerMap.recordtype - 1] || '').toString().toLowerCase();
        const rowMobile = String(data[i][headerMap.mobile - 1] || '').replace(/\D/g, '');
        const rowWonOffer = String(data[i][headerMap.wonoffer - 1] || '').trim();
        
        if (spinId && rowSpinId && rowSpinId === spinId) {
          return ContentService
            .createTextOutput('SUCCESS_DUPLICATE_SPIN_IGNORED')
            .setMimeType(ContentService.MimeType.TEXT);
        }
      }
      for (let i = data.length - 1; i >= 1; i -= 1) {
        const rowType = (data[i][headerMap.recordtype - 1] || '').toString().toLowerCase();
        const rowMobile = String(data[i][headerMap.mobile - 1] || '').replace(/\D/g, '');
        const rowFullName = String(data[i][headerMap.fullname - 1] || '').toString().trim().toLowerCase();
        if (rowType === 'lead' && (rowMobile === mobileValue || (rowFullName && rowFullName === fullName.trim().toLowerCase()))) {
          // Update by header name so existing sheet column order is preserved.
          sheet.getRange(i + 1, headerMap.wonoffer).setValue(wonOffer);
          sheet.getRange(i + 1, headerMap.rewardcode).setValue(rewardCode);
          sheet.getRange(i + 1, headerMap.spinid).setValue(spinId);
          sheet.getRange(i + 1, headerMap.timestamp).setValue(timestamp);
          applyTextFormats(sheet, headerMap, i + 1);
          return ContentService
            .createTextOutput('SUCCESS_UPDATED_WIN')
            .setMimeType(ContentService.MimeType.TEXT);
        }
      }
      sheet.appendRow(row);
      applyTextFormats(sheet, headerMap, sheet.getLastRow());
      return ContentService
        .createTextOutput('SUCCESS_APPENDED_WIN')
        .setMimeType(ContentService.MimeType.TEXT);
    }

    sheet.appendRow(row);
    applyTextFormats(sheet, headerMap, sheet.getLastRow());

    return ContentService
      .createTextOutput('SUCCESS')
      .setMimeType(ContentService.MimeType.TEXT);
  } catch (error) {
    return ContentService
      .createTextOutput('ERROR: ' + error.message)
      .setMimeType(ContentService.MimeType.TEXT);
  }
}

function getHeaderMap(sheet) {
  const headerRow = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const map = {};
  headerRow.forEach((label, index) => {
    if (!label) return;
    map[normalizeHeader(label)] = index + 1;
  });
  return map;
}

function normalizeHeader(label) {
  return label.toString().trim().toLowerCase();
}

function doStatus() {
  // Deployment check: open the web app URL with ?action=status after redeploying.
  return ContentService
    .createTextOutput(JSON.stringify({
      success: true,
      version: 'spin-sheet-v2-15-column',
      expectedHeaders: ['recordType','fullName','mobile','age','gender','fitnessGoal','currentWeight','targetWeight','experience','startDate','contactMethod','wonOffer','rewardCode','spinId','timestamp']
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

function ensureHeaders(sheet, expectedHeaders) {
  // Always keep row 1 in the exact 15-column order the website submits.
  sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
  return getHeaderMap(sheet);
}

function generateSheetSpinId() {
  // Backend fallback for older pages that submit a win before creating spinId.
  return 'SPIN_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9).toUpperCase();
}

function generateRewardCode(wonOffer) {
  // Backend fallback keeps rewardCode non-blank if an older page misses it.
  const label = (wonOffer || 'REWARD').toString().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) || 'REWARD';
  const padded = (label + 'XXXXXX').slice(0, 6);
  return 'ARMOUR-' + padded + '-' + Math.floor(1000 + Math.random() * 9000);
}

function ensureUniqueSpinId(sheet, headerMap, spinId) {
  // Avoid duplicate spinId values even when a browser retries with a generated fallback.
  const data = sheet.getDataRange().getValues();
  const existing = {};
  for (let i = 1; i < data.length; i += 1) {
    const value = String(data[i][headerMap.spinid - 1] || '').trim();
    if (value) existing[value] = true;
  }
  let uniqueSpinId = String(spinId).trim();
  while (existing[uniqueSpinId]) {
    uniqueSpinId = generateSheetSpinId();
  }
  return uniqueSpinId;
}

function applyTextFormats(sheet, headerMap, rowNumber) {
  try {
    sheet.getRange(rowNumber, headerMap.mobile).setNumberFormat('@');
    sheet.getRange(rowNumber, headerMap.wonoffer).setNumberFormat('@');
    sheet.getRange(rowNumber, headerMap.rewardcode).setNumberFormat('@');
    sheet.getRange(rowNumber, headerMap.spinid).setNumberFormat('@');
    sheet.getRange(rowNumber, headerMap.timestamp).setNumberFormat('@');
  } catch (e) {
    // Formatting is helpful for IDs and timestamps, but should never block saving.
  }
}

function doVerify(e) {
  try {
    const spreadsheetId = '1iwTkqe6kuJjP1frA88cA4vDzmdrBsygwj7lujljhTrQ';
    const ss = SpreadsheetApp.openById(spreadsheetId);
    const sheet = ss.getSheetByName('Sheet1') || ss.getSheets()[0];
    const data = sheet.getDataRange().getValues();
    const headerMap = getHeaderMap(sheet);
    
    const mobile = (e.parameter && e.parameter.mobile) ? String(e.parameter.mobile).replace(/\D/g, '') : '';
    
    const results = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const rowMobile = String(row[headerMap.mobile - 1] || '').replace(/\D/g, '');
      
      if (!mobile || rowMobile === mobile) {
        results.push({
          recordType: row[headerMap.recordtype - 1] || '',
          fullName: row[headerMap.fullname - 1] || '',
          mobile: rowMobile,
          wonOffer: row[headerMap.wonoffer - 1] || '',
          rewardCode: row[headerMap.rewardcode - 1] || '',
          spinId: row[headerMap.spinid - 1] || '',
          timestamp: row[headerMap.timestamp - 1] || ''
        });
      }
    }
    
    return ContentService
      .createTextOutput(JSON.stringify(results))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doRetrieve(e) {
  try {
    const spreadsheetId = '1iwTkqe6kuJjP1frA88cA4vDzmdrBsygwj7lujljhTrQ';
    const ss = SpreadsheetApp.openById(spreadsheetId);
    const sheet = ss.getSheetByName('Sheet1') || ss.getSheets()[0];
    const data = sheet.getDataRange().getValues();
    const headerMap = getHeaderMap(sheet);
    
    const mobile = (e.parameter && e.parameter.mobile) ? String(e.parameter.mobile).replace(/\D/g, '') : '';
    
    if (!mobile) {
      return ContentService
        .createTextOutput(JSON.stringify({ error: 'mobile parameter required' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    const results = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const rowMobile = String(row[headerMap.mobile - 1] || '').replace(/\D/g, '');
      
      if (rowMobile === mobile) {
        results.push({
          recordType: row[headerMap.recordtype - 1] || '',
          fullName: row[headerMap.fullname - 1] || '',
          mobile: rowMobile,
          age: row[headerMap.age - 1] || '',
          gender: row[headerMap.gender - 1] || '',
          fitnessGoal: row[headerMap.fitnessgoal - 1] || '',
          currentWeight: row[headerMap.currentweight - 1] || '',
          targetWeight: row[headerMap.targetweight - 1] || '',
          experience: row[headerMap.experience - 1] || '',
          startDate: row[headerMap.startdate - 1] || '',
          contactMethod: row[headerMap.contactmethod - 1] || '',
          wonOffer: row[headerMap.wonoffer - 1] || '',
          rewardCode: row[headerMap.rewardcode - 1] || '',
          spinId: row[headerMap.spinid - 1] || '',
          timestamp: row[headerMap.timestamp - 1] || ''
        });
      }
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        count: results.length,
        records: results
      }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: error.message, success: false }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
