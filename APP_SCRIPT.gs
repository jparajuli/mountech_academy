/**
 * MOUNTECH ACADEMY WORKSPACE - GOOGLE APPS SCRIPT
 * 
 * Paste this script into your Google Sheet's Apps Script editor:
 * 1. Open your Google Sheet (e.g., matching GOOGLE_SHEET_ID).
 * 2. Click Extensions -> Apps Script.
 * 3. Delete any boilerplate code and paste this entire script.
 * 4. Click Save (Disk Icon).
 * 5. (Optional) Click Deploy -> New Deployment -> Select Type: Web App.
 *    - Execute as: Me (your-email)
 *    - Who has access: Anyone
 *    - This gives you a public Webhook URL to stream real-time logs remotely from other instances!
 */

function doPost(e) {
  try {
    var rawData = e.postData.contents;
    var data = JSON.parse(rawData);
    
    var email = data.email || "Unknown Email";
    var name = data.name || "Unknown Scholar";
    var timestamp = data.timestamp || new Date().toISOString();
    
    var doc = SpreadsheetApp.getActiveSpreadsheet();
    
    if (data.type === "get_status") {
      var emailQuery = (data.email || "").trim().toLowerCase();
      var sheet = doc.getSheetByName("Sheet1");
      var enrollments = [];
      var completions = [];
      
      if (sheet) {
        var rows = sheet.getDataRange().getValues();
        for (var i = 1; i < rows.length; i++) {
          var rowEmail = rows[i][1] ? rows[i][1].toString().trim().toLowerCase() : "";
          if (rowEmail === emailQuery) {
            var courseId = rows[i][3] ? rows[i][3].toString().trim() : "";
            var status = rows[i][5] ? rows[i][5].toString().trim() : "";
            if (courseId) {
              enrollments.push(courseId);
              if (status === "Completed") {
                completions.push(courseId);
              }
            }
          }
        }
      }
      
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        enrollments: enrollments,
        completions: completions
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Check if it's an enrollment/completion or a login log
    if (data.type === "enrollment" || data.courseId) {
      var courseId = data.courseId || "unknown_course";
      var courseTitle = data.courseTitle || "Course Title";
      var status = data.status || "Enrolled";
      
      var sheet = doc.getSheetByName("Sheet1");
      if (!sheet) {
        sheet = doc.insertSheet("Sheet1");
        sheet.appendRow(["Timestamp", "Email Address", "Scholar Name", "Course ID", "Course Title", "Status"]);
        
        // Header styling
        var headerRange = sheet.getRange(1, 1, 1, 6);
        headerRange.setBackground("#0070f3");
        headerRange.setFontColor("#ffffff");
        headerRange.setFontWeight("bold");
        headerRange.setFontFamily("Inter");
        sheet.setFrozenRows(1);
      }
      
      var rows = sheet.getDataRange().getValues();
      var updated = false;
      
      if (status === "Completed") {
        for (var i = 1; i < rows.length; i++) {
          var rowEmail = rows[i][1] ? rows[i][1].toString().trim().toLowerCase() : "";
          var rowCourseId = rows[i][3] ? rows[i][3].toString().trim().toLowerCase() : "";
          if (rowEmail === email.trim().toLowerCase() && rowCourseId === courseId.trim().toLowerCase()) {
            sheet.getRange(i + 1, 6).setValue("Completed");
            updated = true;
            break;
          }
        }
      }
      
      if (!updated) {
        sheet.appendRow([timestamp, email, name, courseId, courseTitle, status]);
      }
      
      for (var col = 1; col <= sheet.getLastColumn(); col++) {
        sheet.autoResizeColumn(col);
      }
      
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: "Successfully synchronized enrollment securely to Google Sheets."
      })).setMimeType(ContentService.MimeType.JSON);
      
    } else {
      var status = data.status || "Attempt";
      var details = data.details || "API Call";
      
      var sheet = doc.getSheetByName("Logins");
      if (!sheet) {
        sheet = doc.insertSheet("Logins");
        sheet.appendRow(["Timestamp", "Email Address", "Scholar Name", "Login Status", "Session Identifier"]);
        
        // Modern slate header styling
        var headerRange = sheet.getRange(1, 1, 1, 5);
        headerRange.setBackground("#0f172a");
        headerRange.setFontColor("#f8fafc");
        headerRange.setFontWeight("bold");
        headerRange.setFontFamily("Inter");
        sheet.setFrozenRows(1);
      }
      
      sheet.appendRow([timestamp, email, name, status, details]);
      
      for (var col = 1; col <= sheet.getLastColumn(); col++) {
        sheet.autoResizeColumn(col);
      }
      
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: "Successfully recorded login session information."
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return HtmlService.createHtmlOutput(
    "<div style='font-family: sans-serif; padding: 40px; text-align: center; color: #1e293b;'>" +
    "  <h1 style='color: #0284c7; font-size: 24px;'>📡 Mountech Academy Apps Script Is Active</h1>" +
    "  <p style='color: #64748b;'>Use HTTP POST requests to programmatically stream and log verified student credentials and active classroom logins.</p>" +
    "</div>"
  );
}

/**
 * Utility function to test or manually seed the spreadsheet log.
 * You can select 'testLoginLogger' and click Run inside the Google Apps Script UI.
 */
function testLoginLogger() {
  var mockEvent = {
    postData: {
      contents: JSON.stringify({
        email: "test-scholar@mountech.academy",
        name: "Test Scholar",
        status: "SUCCESS_VERIFIED",
        timestamp: new Date().toISOString(),
        details: "Manual Apps Script Test"
      })
    }
  };
  
  var response = doPost(mockEvent);
  Logger.log("Result: " + response.getContent());
}
