import { google } from "googleapis";

export function getCleanPrivateKey(): string | undefined {
  const rawKey = process.env.GOOGLE_PRIVATE_KEY;
  if (!rawKey) return undefined;

  let cleanKey = rawKey.trim();

  // If the user pasted the entire service account JSON
  if (cleanKey.startsWith("{") && cleanKey.endsWith("}")) {
    try {
      const parsed = JSON.parse(cleanKey);
      if (parsed.private_key) {
        cleanKey = parsed.private_key;
        if (parsed.client_email && !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
          process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = parsed.client_email;
        }
        if (parsed.spreadsheet_id && !process.env.GOOGLE_SHEET_ID) {
          process.env.GOOGLE_SHEET_ID = parsed.spreadsheet_id;
        }
      }
    } catch {
      // Ignored, proceed
    }
  }
  
  // Clean potential surrounding double/single quotes or backticks
  if ((cleanKey.startsWith('"') && cleanKey.endsWith('"')) ||
      (cleanKey.startsWith("'") && cleanKey.endsWith("'")) ||
      (cleanKey.startsWith("`") && cleanKey.endsWith("`"))) {
    cleanKey = cleanKey.slice(1, -1);
  }

  // Handle double-escaped newlines
  cleanKey = cleanKey.replace(/\\\\n/g, "\n");
  cleanKey = cleanKey.replace(/\\n/g, "\n");
  cleanKey = cleanKey.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // Reconstruct PEM if it was single-lined
  if (cleanKey.includes("BEGIN PRIVATE KEY") && !cleanKey.includes("\n")) {
    const match = cleanKey.match(/-----BEGIN PRIVATE KEY-----(.*)-----END PRIVATE KEY-----/);
    if (match) {
      const base64Content = match[1].replace(/\s+/g, ""); // remove all spacing/tabs
      const chunks = [];
      for (let i = 0; i < base64Content.length; i += 64) {
        chunks.push(base64Content.substring(i, i + 64));
      }
      cleanKey = `-----BEGIN PRIVATE KEY-----\n${chunks.join("\n")}\n-----END PRIVATE KEY-----`;
    }
  }

  return cleanKey.trim();
}

export function getCleanServiceAccountEmail(): string | undefined {
  const rawEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  if (!rawEmail) return undefined;
  
  let cleanEmail = rawEmail.trim();
  if ((cleanEmail.startsWith('"') && cleanEmail.endsWith('"')) ||
      (cleanEmail.startsWith("'") && cleanEmail.endsWith("'")) ||
      (cleanEmail.startsWith("`") && cleanEmail.endsWith("`"))) {
    cleanEmail = cleanEmail.slice(1, -1);
  }
  return cleanEmail.trim();
}

export function getCleanSpreadsheetId(): string | undefined {
  const rawId = process.env.GOOGLE_SHEET_ID;
  if (!rawId) return undefined;
  
  let cleanId = rawId.trim();
  if ((cleanId.startsWith('"') && cleanId.endsWith('"')) ||
      (cleanId.startsWith("'") && cleanId.endsWith("'")) ||
      (cleanId.startsWith("`") && cleanId.endsWith("`"))) {
    cleanId = cleanId.slice(1, -1);
  }
  return cleanId.trim();
}

export function getAppsScriptUrl(): string | undefined {
  const envUrl = process.env.GOOGLE_APPS_SCRIPT_URL;
  if (envUrl && envUrl.trim().startsWith("https://script.google.com/")) {
    return envUrl.trim();
  }
  const sheetId = getCleanSpreadsheetId();
  if (sheetId && sheetId.startsWith("https://script.google.com/")) {
    return sheetId;
  }
  return undefined;
}

export async function appendToAppsScript(payload: any): Promise<boolean> {
  const url = getAppsScriptUrl();
  if (!url) return false;
  
  try {
    console.log(`[APPS SCRIPT WEBHOOK] Sending post request to ${url} ...`);
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      console.warn(`[APPS SCRIPT WEBHOOK] Failed with status ${response.status}`);
      return false;
    }
    
    const result = await response.json();
    console.log("[APPS SCRIPT WEBHOOK] Response result:", result);
    return !!(result && (result.success || result.success === undefined));
  } catch (error: any) {
    console.error("[APPS SCRIPT WEBHOOK] Error posting data:", error.message || error);
    return false;
  }
}

export async function fetchEnrollmentsFromAppsScript(email: string): Promise<{ enrollments: string[]; completions: string[] }> {
  const url = getAppsScriptUrl();
  if (!url) {
    return { enrollments: [], completions: [] };
  }
  
  try {
    console.log(`[APPS SCRIPT FETCH] Fetching states for ${email} ...`);
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "get_status",
        email: email
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Apps Script responded with status ${response.status}`);
    }
    
    const result = await response.json();
    if (result && result.success) {
      return {
        enrollments: result.enrollments || [],
        completions: result.completions || []
      };
    }
    throw new Error((result && result.error) || "Failed to fetch from Apps Script");
  } catch (error: any) {
    console.error("[APPS SCRIPT FETCH ERR] Error fetching status from Web App:", error.message || error);
    throw error;
  }
}

export function hasSheetsConfig(): boolean {
  if (getAppsScriptUrl()) return true;
  const email = getCleanServiceAccountEmail();
  const key = getCleanPrivateKey();
  const id = getCleanSpreadsheetId();
  return !!(email && key && id);
}

export function logSheetError(context: string, error: any) {
  if (error && error.message && (error.message.includes("invalid_grant") || error.message.includes("signature") || error.message.includes("auth"))) {
    console.warn(`[GOOGLE SHEET SYNC] ${context} deferred with local fallback (Credentials or Private Key is invalid or expired).`);
  } else {
    console.error(`[GOOGLE SHEET SYNC RESILIENCY] ${context} error:`, error?.message || error);
  }
}

export async function appendEnrollmentToSheet(email: string, name: string, courseId: string, courseTitle: string) {
  const appsScriptUrl = getAppsScriptUrl();
  if (appsScriptUrl) {
    const success = await appendToAppsScript({
      type: "enrollment",
      email,
      name,
      courseId,
      courseTitle,
      status: "Enrolled",
      timestamp: new Date().toISOString()
    });
    if (!success) {
      throw new Error("Failed to synchronize enrollment via Google Apps Script.");
    }
    return;
  }

  const clientEmail = getCleanServiceAccountEmail();
  const privateKey = getCleanPrivateKey();
  const spreadsheetId = getCleanSpreadsheetId();

  if (!clientEmail || !privateKey || !spreadsheetId) {
    throw new Error("Google Sheets credentials are not fully configured in your environment.");
  }

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({ version: "v4", auth });

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: "Sheet1!A:F",
    valueInputOption: "RAW",
    requestBody: {
      values: [[new Date().toISOString(), email, name, courseId, courseTitle, "Enrolled"]],
    },
  });
}

export async function appendLoginToSheet(email: string, name: string, status: string, details: string) {
  const appsScriptUrl = getAppsScriptUrl();
  if (appsScriptUrl) {
    await appendToAppsScript({
      type: "login",
      email,
      name,
      status,
      timestamp: new Date().toISOString(),
      details
    });
    return;
  }

  const clientEmail = getCleanServiceAccountEmail();
  const privateKey = getCleanPrivateKey();
  const spreadsheetId = getCleanSpreadsheetId();

  if (!clientEmail || !privateKey || !spreadsheetId) {
    console.log("[GOOGLE SHEETS ENGINE] Skipping login logging to worksheet because credentials are not configured.");
    return;
  }

  try {
    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    // 1. Retrieve spreadsheet metadata to inspect sheets
    const spreadSheetMeta = await sheets.spreadsheets.get({ spreadsheetId });
    const loginsTabExists = spreadSheetMeta.data.sheets?.some(
      (s: any) => s.properties?.title === "Logins"
    );

    if (!loginsTabExists) {
      console.log("[GOOGLE SHEETS ENGINE] 'Logins' worksheet not found. Creating table and headers dynamically.");
      
      // Create empty sheet title "Logins"
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: { title: "Logins" },
              },
            },
          ],
        },
      });

      // Fill headers: ["Timestamp", "Email Address", "Scholar Name", "Login Status", "Session Identifier"]
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: "Logins!A1:E1",
        valueInputOption: "RAW",
        requestBody: {
          values: [["Timestamp", "Email Address", "Scholar Name", "Login Status", "Session Identifier"]],
        },
      });
    }

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: "Logins!A:E",
      valueInputOption: "RAW",
      requestBody: {
        values: [[new Date().toISOString(), email, name, status, details]],
      },
    });

    console.log(`[GOOGLE SHEETS ENGINE] Appended login log entry for ${email} -> [${status}]`);
  } catch (err: any) {
    logSheetError("Failed to append login log entry", err);
  }
}

export async function fetchEnrollmentsAndCompletionsFromSheet(email: string): Promise<{ enrollments: string[]; completions: string[] }> {
  const appsScriptUrl = getAppsScriptUrl();
  if (appsScriptUrl) {
    return fetchEnrollmentsFromAppsScript(email);
  }

  const clientEmail = getCleanServiceAccountEmail();
  const privateKey = getCleanPrivateKey();
  const spreadsheetId = getCleanSpreadsheetId();

  if (!clientEmail || !privateKey || !spreadsheetId) {
    throw new Error("Google Sheets credentials are not configured.");
  }

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({ version: "v4", auth });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "Sheet1!A:F",
  });

  const rows = res.data.values;
  if (!rows || rows.length <= 1) {
    return { enrollments: [], completions: [] };
  }

  const enrollments: string[] = [];
  const completions: string[] = [];
  const queryEmail = email.trim().toLowerCase();

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const rowEmail = row[1] ? row[1].toString().trim().toLowerCase() : "";
    if (rowEmail === queryEmail) {
      const courseId = row[3] ? row[3].toString().trim() : "";
      const status = row[5] ? row[5].toString().trim() : "";
      if (courseId) {
        enrollments.push(courseId);
        if (status === "Completed") {
          completions.push(courseId);
        }
      }
    }
  }

  return { enrollments, completions };
}

export async function markCourseCompletedInSheet(email: string, courseId: string) {
  const appsScriptUrl = getAppsScriptUrl();
  if (appsScriptUrl) {
    const success = await appendToAppsScript({
      type: "enrollment",
      email,
      courseId,
      status: "Completed",
      timestamp: new Date().toISOString()
    });
    if (!success) {
      throw new Error("Failed to update course completion in Google Sheets via Apps Script.");
    }
    return;
  }

  const clientEmail = getCleanServiceAccountEmail();
  const privateKey = getCleanPrivateKey();
  const spreadsheetId = getCleanSpreadsheetId();

  if (!clientEmail || !privateKey || !spreadsheetId) {
    throw new Error("Google Sheets credentials are not fully configured.");
  }

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({ version: "v4", auth });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "Sheet1!A:F",
  });

  const rows = res.data.values;
  if (!rows || rows.length <= 1) {
    throw new Error("No enrollment database rows found in the sheet.");
  }

  let rowNumber = -1;
  const queryEmail = email.trim().toLowerCase();
  const queryCourseId = courseId.trim().toLowerCase();

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const rowEmail = row[1] ? row[1].toString().trim().toLowerCase() : "";
    const rowCourse = row[3] ? row[3].toString().trim().toLowerCase() : "";
    if (rowEmail === queryEmail && rowCourse === queryCourseId) {
      rowNumber = i + 1;
      break;
    }
  }

  if (rowNumber === -1) {
    // Append completed row directly if enrollment is not found
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: "Sheet1!A:F",
      valueInputOption: "RAW",
      requestBody: {
        values: [[new Date().toISOString(), email, "Scholar", courseId, "Completed Course", "Completed"]],
      },
    });
  } else {
    const updateRange = `Sheet1!F${rowNumber}`;
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: updateRange,
      valueInputOption: "RAW",
      requestBody: {
        values: [["Completed"]],
      },
    });
  }
}
