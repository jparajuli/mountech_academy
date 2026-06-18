import fs from "fs";
import path from "path";
import db from "./database.js";

const USERS_FILE = path.join(process.cwd(), "users.json");
const ENROLLMENTS_FILE = path.join(process.cwd(), "enrollments.json");
const LOGINS_FILE = path.join(process.cwd(), "logins.json");
const RATINGS_FILE = path.join(process.cwd(), "ratings.json");

function getUserRole(userObj: any): "admin" | "instructor" | "student" {
  if (userObj.role && userObj.role !== "developer") return userObj.role;
  const email = (userObj.email || "").trim().toLowerCase();
  if (email === "jhanak.parajuli@gmail.com" || email === "admin@mountech.academy" || email === "developer@mountech.academy") {
    return "admin";
  } else if (email === "instructor@mountech.academy") {
    return "instructor";
  }
  return "student";
}

export function runMigration() {
  console.log("🏁 Starting SQLite Migration...");

  db.transaction(() => {
    // 1. Migrate Users
    if (fs.existsSync(USERS_FILE)) {
      try {
        const users = JSON.parse(fs.readFileSync(USERS_FILE, "utf-8"));
        const stmt = db.prepare(`
          INSERT OR IGNORE INTO users (email, name, passwordHash, passwordAlgorithm, role, isVerified, verificationToken)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        let count = 0;
        for (const user of users) {
          const email = user.email.trim().toLowerCase();
          const name = user.name || "Unknown";
          const pwHash = user.passwordHash || "";
          const algo = user.passwordAlgorithm || "sha256";
          const role = getUserRole(user);
          const verified = user.isVerified ? 1 : 0;
          const token = user.verificationToken || null;

          stmt.run(email, name, pwHash, algo, role, verified, token);
          count++;
        }
        console.log(`✓ Migrated ${count} users successfully.`);
      } catch (err: any) {
        console.error("✗ Failed to migrate users:", err.message);
      }
    } else {
      console.log("ℹ No users.json file found to migrate.");
    }

    // 2. Migrate Enrollments
    if (fs.existsSync(ENROLLMENTS_FILE)) {
      try {
        const enrollments = JSON.parse(fs.readFileSync(ENROLLMENTS_FILE, "utf-8"));
        const stmt = db.prepare(`
          INSERT INTO enrollments (email, name, courseId, courseTitle, status, timestamp)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        
        // Ensure we don't duplicate if they're already in db
        db.prepare("DELETE FROM enrollments").run();
        
        let count = 0;
        for (const e of enrollments) {
          // Double check that the user exists in sqlite user table, otherwise create a shell or ignore
          const userExists = db.prepare("SELECT 1 FROM users WHERE email = ?").get(e.email.trim().toLowerCase());
          if (!userExists) {
            // Safe fallback user creation in case schema enforcement is strict
            db.prepare(`
              INSERT OR IGNORE INTO users (email, name, passwordHash, passwordAlgorithm, role, isVerified)
              VALUES (?, ?, 'migrated_placeholder', 'sha256', 'student', 1)
            `).run(e.email.trim().toLowerCase(), e.name || "Scholar");
          }

          stmt.run(
            e.email.trim().toLowerCase(),
            e.name || "Scholar",
            e.courseId,
            e.courseTitle || "Course Title",
            e.status || "Enrolled",
            e.timestamp || new Date().toISOString()
          );
          count++;
        }
        console.log(`✓ Migrated ${count} enrollments successfully.`);
      } catch (err: any) {
        console.error("✗ Failed to migrate enrollments:", err.message);
      }
    } else {
      console.log("ℹ No enrollments.json file found to migrate.");
    }

    // 3. Migrate Logins
    if (fs.existsSync(LOGINS_FILE)) {
      try {
        const logins = JSON.parse(fs.readFileSync(LOGINS_FILE, "utf-8"));
        const stmt = db.prepare(`
          INSERT INTO logins (email, name, status, timestamp, details)
          VALUES (?, ?, ?, ?, ?)
        `);
        
        db.prepare("DELETE FROM logins").run();

        let count = 0;
        for (const l of logins) {
          stmt.run(
            l.email.trim().toLowerCase(),
            l.name || "Scholar",
            l.status || "SUCCESS",
            l.timestamp || new Date().toISOString(),
            l.details || ""
          );
          count++;
        }
        console.log(`✓ Migrated ${count} logins successfully.`);
      } catch (err: any) {
        console.error("✗ Failed to migrate logins:", err.message);
      }
    } else {
      console.log("ℹ No logins.json file found to migrate.");
    }

    // 4. Migrate Ratings
    if (fs.existsSync(RATINGS_FILE)) {
      try {
        const ratings = JSON.parse(fs.readFileSync(RATINGS_FILE, "utf-8"));
        const stmt = db.prepare(`
          INSERT OR REPLACE INTO ratings (id, courseId, email, name, rating, review, timestamp)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        
        // Ensure references exist
        let count = 0;
        for (const r of ratings) {
          const email = r.email.trim().toLowerCase();
          const userExists = db.prepare("SELECT 1 FROM users WHERE email = ?").get(email);
          if (!userExists) {
            db.prepare(`
              INSERT OR IGNORE INTO users (email, name, passwordHash, passwordAlgorithm, role, isVerified)
              VALUES (?, ?, 'migrated_placeholder', 'sha256', 'student', 1)
            `).run(email, r.name || "Scholar");
          }

          stmt.run(
            r.id || Math.random().toString(36).substring(2, 10),
            r.courseId,
            email,
            r.name || "Scholar",
            Number(r.rating) || 5,
            r.review || "",
            r.timestamp || new Date().toISOString()
          );
          count++;
        }
        console.log(`✓ Migrated ${count} ratings successfully.`);
      } catch (err: any) {
        console.error("✗ Failed to migrate ratings:", err.message);
      }
    } else {
      console.log("ℹ No ratings.json file found to migrate.");
    }
  })();

  console.log("✨ SQLite Migration Complete!");
}
