import db from "../db/database.js";
import { sendLiveClassReminderEmail } from "./email.js";

export function processReminderEmails() {
  try {
    // 1. Fetch pending unsent live sessions
    const sessions = db.prepare(`
      SELECT id, course_id, title, start_time 
      FROM live_sessions 
      WHERE reminder_sent = 0
    `).all() as any[];

    if (sessions.length === 0) {
      return;
    }

    const currentEpoch = Date.now();
    const fifteenMinMs = 15 * 60 * 1000;
    // Plus 30 seconds cushion for periodic timer check misalignment
    const maxThreshold = fifteenMinMs + 30 * 1000;

    for (const session of sessions) {
      const startEpoch = new Date(session.start_time).getTime();
      const diffMs = startEpoch - currentEpoch;

      // Check if session starts within the next 15 minutes, and has not yet started/expired
      if (diffMs > 0 && diffMs <= maxThreshold) {
        console.log(`[SCHEDULER] Live Session "${session.title}" (ID: ${session.id}) starts in ${Math.round(diffMs / 60000)} minutes. Processing notifications...`);

        // A. Instantly mark as sent to avoid dual firing or racing
        db.prepare("UPDATE live_sessions SET reminder_sent = 1 WHERE id = ?").run(session.id);

        // B. Query the associated elective course details
        const course = db.prepare("SELECT title FROM courses WHERE id = ?").get(session.course_id) as { title: string } | undefined;
        const courseTitle = course ? course.title : "Mountech Corporate Elective";

        // C. Track down all scholars registered for this track
        const enrollments = db.prepare(`
          SELECT email, name FROM enrollments 
          WHERE courseId = ?
        `).all(session.course_id) as any[];

        if (enrollments.length === 0) {
          console.log(`[SCHEDULER] No active student enrollments found for course track ID: ${session.course_id}.`);
          continue;
        }

        console.log(`[SCHEDULER] Dispatched reminders of course "${courseTitle}" to ${enrollments.length} enrolled student(s).`);

        const generatedJitsiUrl = `https://meet.jit.si/MountechAcademy-LiveClass-${session.id || session.course_id}`;

        // D. Trigger the email dispatch safely
        for (const scholar of enrollments) {
          sendLiveClassReminderEmail(
            scholar.email.trim(),
            scholar.name.trim(),
            session.title.trim(),
            session.start_time,
            generatedJitsiUrl,
            courseTitle
          ).catch((mailErr) => {
            console.error(`[SCHEDULER MAIL EXCEPTION] Failed to dispatch to user ${scholar.email}:`, mailErr);
          });
        }
      }
    }
  } catch (err: any) {
    console.error("[CRITICAL SCHEDULER ERROR]", err);
  }
}

export function startLiveSessionReminderScheduler() {
  console.log("⏰ [SYSTEM INTEGRATION] Automated Live Class Email Reminder Scheduler started successfully.");
  
  // Run on startup
  processReminderEmails();

  // Run checking interval once every minute (60,000 milliseconds)
  const timer = setInterval(() => {
    processReminderEmails();
  }, 60 * 1000);

  // Safely auto-terminate on server close
  return () => clearInterval(timer);
}
