#!/usr/bin/env node

import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";

const DEFAULT_BUDGET = 5;
const DEFAULT_STATE_FILE = ".real-email-budget.json";
const SAFE_TEST_DOMAINS = new Set([
  "example.com",
  "example.org",
  "example.net",
  "invalid",
  "localhost",
  "test",
]);
const TRUE_VALUES = new Set(["1", "true", "yes", "y"]);
const LOCK_RETRY_MS = 50;
const LOCK_TIMEOUT_MS = 5_000;

function parseArgs(argv) {
  const args = [...argv];
  const emails = [];
  let stateFile = process.env.REAL_EMAIL_BUDGET_STATE_FILE || DEFAULT_STATE_FILE;
  let budget = Number.parseInt(
    process.env.REAL_EMAIL_BUDGET || String(DEFAULT_BUDGET),
    10
  );
  let reset = false;

  while (args.length) {
    const arg = args.shift();
    if (!arg) {
      continue;
    }

    if (arg === "--reset") {
      reset = true;
      continue;
    }

    if (arg === "--state") {
      const value = args.shift();
      if (!value) {
        throw new Error("--state requires a path");
      }
      stateFile = value;
      continue;
    }

    if (arg === "--budget") {
      const value = args.shift();
      if (!value) {
        throw new Error("--budget requires a number");
      }
      budget = Number.parseInt(value, 10);
      continue;
    }

    if (arg.startsWith("--")) {
      throw new Error(`Unknown option: ${arg}`);
    }

    emails.push(arg);
  }

  if (!Number.isFinite(budget) || budget < 0) {
    throw new Error(`Invalid budget: ${budget}`);
  }

  return {
    budget,
    emails,
    reset,
    stateFile: path.resolve(process.cwd(), stateFile),
  };
}

function loadState(stateFile) {
  if (!fs.existsSync(stateFile)) {
    return { used: 0, realEmails: [] };
  }

  const raw = fs.readFileSync(stateFile, "utf8");
  const parsed = JSON.parse(raw);
  return {
    used: Number.isFinite(parsed.used) ? parsed.used : 0,
    realEmails: Array.isArray(parsed.realEmails) ? parsed.realEmails : [],
  };
}

function saveState(stateFile, state) {
  fs.writeFileSync(stateFile, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function withLock(stateFile, callback) {
  const lockFile = `${stateFile}.lock`;
  const deadline = Date.now() + LOCK_TIMEOUT_MS;

  while (true) {
    try {
      const handle = await fsp.open(lockFile, "wx");
      try {
        return await callback();
      } finally {
        await handle.close();
        await fsp.rm(lockFile, { force: true });
      }
    } catch (error) {
      if (error && typeof error === "object" && error.code === "EEXIST") {
        if (Date.now() >= deadline) {
          throw new Error(`Timed out waiting for email budget lock: ${lockFile}`);
        }
        await sleep(LOCK_RETRY_MS);
        continue;
      }
      throw error;
    }
  }
}

function isApproved() {
  return TRUE_VALUES.has(
    String(process.env.REAL_EMAIL_BUDGET_APPROVED || "").trim().toLowerCase()
  );
}

function isRealEmail(email) {
  const atIndex = email.lastIndexOf("@");
  if (atIndex === -1) {
    throw new Error(`Invalid email address: ${email}`);
  }

  const domain = email.slice(atIndex + 1).trim().toLowerCase();
  return !SAFE_TEST_DOMAINS.has(domain);
}

function formatSummary(message, stateFile, budget, state) {
  return [
    message,
    `state file: ${stateFile}`,
    `budget: ${budget}`,
    `used: ${state.used}`,
  ].join("\n");
}

async function main() {
  const { budget, emails, reset, stateFile } = parseArgs(process.argv.slice(2));

  await withLock(stateFile, async () => {
    if (reset) {
      const clearedState = { used: 0, realEmails: [] };
      saveState(stateFile, clearedState);
      console.log(formatSummary("Real email budget reset.", stateFile, budget, clearedState));
      return;
    }

    const state = loadState(stateFile);

    if (!emails.length) {
      console.log(formatSummary("Real email budget status.", stateFile, budget, state));
      return;
    }

    const realEmails = emails.filter(isRealEmail);
    if (!realEmails.length) {
      console.log(
        formatSummary(
          "No real inbox domains detected. Budget unchanged.",
          stateFile,
          budget,
          state
        )
      );
      return;
    }

    const nextUsed = state.used + realEmails.length;
    if (nextUsed > budget && !isApproved()) {
      const details = [
        `Refusing to send ${realEmails.length} real email(s).`,
        `This would raise the run total from ${state.used} to ${nextUsed}, above the budget of ${budget}.`,
        "Set REAL_EMAIL_BUDGET_APPROVED=1 only after explicit user approval.",
        `state file: ${stateFile}`,
        `emails: ${realEmails.join(", ")}`,
      ].join("\n");
      throw new Error(details);
    }

    const nextState = {
      used: nextUsed,
      realEmails: [...state.realEmails, ...realEmails],
    };
    saveState(stateFile, nextState);

    console.log(
      [
        `Reserved ${realEmails.length} real email(s).`,
        `state file: ${stateFile}`,
        `budget: ${budget}`,
        `used: ${nextState.used}`,
        `emails: ${realEmails.join(", ")}`,
        isApproved() && nextUsed > budget ? "override: REAL_EMAIL_BUDGET_APPROVED=1" : null,
      ]
        .filter(Boolean)
        .join("\n")
    );
  });
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
