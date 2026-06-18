import { Request, Response } from "express";
import db from "../../server/db/database.js";

/**
 * Handles incoming Pipeline webhook events from GitLab, validates authentication,
 * matches the repository URL against registered links, maps pipeline result to grading criteria,
 * and updates local SQLite state accordingly.
 */
export async function handleGitLabWebhook(req: Request, res: Response): Promise<any> {
  try {
    // Phase 1: Security Verification
    const gitlabToken = req.headers["x-gitlab-token"];
    const webhookSecret = process.env.GITLAB_WEBHOOK_SECRET;

    if (!gitlabToken || gitlabToken !== webhookSecret) {
      return res.status(403).json({ error: "Forbidden: Signature verification failed or missing token." });
    }

    // Phase 2: Payload Event Parsing
    const gitlabEvent = req.headers["x-gitlab-event"];
    if (gitlabEvent !== "Pipeline Hook") {
      // Return 200 OK to acknowledge receipt but take no action
      return res.status(200).json({ message: "Acknowledged event type, no pipeline updates required." });
    }

    const { object_attributes, commit, project } = req.body || {};
    
    if (!object_attributes || !commit || !project) {
      return res.status(400).json({ error: "Invalid payload shape." });
    }

    const status = object_attributes.status; // e.g., "success", "failed", "running", "canceled"
    const commitId = commit.id || "";
    const commitHash = commitId.substring(0, 8);
    const repoUrl = project.web_url;

    if (!repoUrl) {
      return res.status(400).json({ error: "Missing repository web URL in payload." });
    }

    // Phase 3: Database Lookup & Sync
    // Query check to retrieve ID of linked GitLab assignment
    const link = db.prepare("SELECT id FROM gitlab_links WHERE gitlabRepoUrl = ?").get(repoUrl) as { id: number } | undefined;

    if (!link) {
      return res.status(404).json({ error: "Repository link not registered in our local systems." });
    }

    // Map the incoming pipeline status to the designated portal formats
    let internalStatus = "Connected";
    let grade = "Pending";

    if (status === "success") {
      internalStatus = "Synced & Verified";
      grade = "100 / 100";
    } else if (status === "failed") {
      internalStatus = "Failed Check";
      grade = "0 / 100 (Tests Failed)";
    } else if (status === "running" || status === "pending") {
      internalStatus = "Running Builds";
      grade = "Pending";
    } else {
      // Graceful fallback for other statuses like canceled, manual, skipped
      internalStatus = "Failed Check";
      grade = `0 / 100 (Build ${status || "Aborted"})`;
    }

    // Execute SQLite UPDATE state changes
    db.prepare(`
      UPDATE gitlab_links
      SET status = ?, grade = ?, commitHash = ?
      WHERE id = ?
    `).run(internalStatus, grade, commitHash, link.id);

    // Phase 4: Output Successful Response Handling
    return res.status(200).json({
      message: "Webhook processed and automated grades synchronized successfully.",
      details: {
        gitlabRepoUrl: repoUrl,
        pipelineStatus: status,
        internalStatus,
        assignedGrade: grade,
        commitHash
      }
    });

  } catch (err: any) {
    console.error("Failed to process GitLab pipeline payload:", err);
    return res.status(500).json({ error: "Internal server error processing compilation payload." });
  }
}
