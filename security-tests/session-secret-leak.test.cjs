/**
 * Verifies that the collaboration session GET endpoint never leaks
 * sessionSecret or passwordHash to callers — authenticated or not.
 *
 * These tests exercise sessionStore helpers directly (no HTTP server needed)
 * so they run fast and without network access.
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const storeUrl = pathToFileURL(
  path.join(__dirname, "..", "lib", "collaboration", "sessionStore.js"),
).href;

async function loadStore() {
  return import(storeUrl);
}

function legacySha256(password) {
  return crypto.createHash("sha256").update(String(password)).digest("hex");
}

test("getPublicCollaborationSession strips sessionSecret from public session", async () => {
  const {
    createCollaborationSession,
    getPublicCollaborationSession,
  } = await loadStore();

  const { session, sessionSecret } = await createCollaborationSession({
    title: "Leak test — public",
    visibility: "public",
  });

  assert.ok(sessionSecret, "createCollaborationSession must return sessionSecret to creator");

  const pub = await getPublicCollaborationSession(session.id);

  assert.ok(pub, "getPublicCollaborationSession must return a result for existing session");
  assert.equal(
    pub.sessionSecret,
    undefined,
    "sessionSecret must not appear in public session view",
  );
  assert.equal(
    pub.passwordHash,
    undefined,
    "passwordHash must not appear in public session view",
  );
});

test("getPublicCollaborationSession strips passwordHash from private session", async () => {
  const {
    createCollaborationSession,
    getPublicCollaborationSession,
  } = await loadStore();

  const { session } = await createCollaborationSession({
    title: "Leak test — private",
    visibility: "private",
    password: "hunter2",
  });

  const pub = await getPublicCollaborationSession(session.id);

  assert.ok(pub, "getPublicCollaborationSession must return a result for private session");
  assert.equal(
    pub.passwordHash,
    undefined,
    "passwordHash must never be returned by the public helper",
  );
  assert.equal(
    pub.sessionSecret,
    undefined,
    "sessionSecret must never be returned by the public helper",
  );
});

test("getPublicCollaborationSession returns null for non-existent session", async () => {
  const { getPublicCollaborationSession } = await loadStore();

  const result = await getPublicCollaborationSession("session_nonexistent00");
  assert.equal(result, null, "must return null for unknown session ID");
});

test("getPublicCollaborationSession returns only discoverable fields", async () => {
  const {
    createCollaborationSession,
    getPublicCollaborationSession,
  } = await loadStore();

  const { session } = await createCollaborationSession({
    title: "Field audit",
    visibility: "public",
    module: "sorting",
    createdBy: "tester",
  });

  const pub = await getPublicCollaborationSession(session.id);

  const allowed = new Set([
    "id",
    "joinCode",
    "title",
    "visibility",
    "module",
    "createdAt",
    "updatedAt",
    "participantCount",
  ]);

  const returned = Object.keys(pub);
  for (const field of returned) {
    assert.ok(
      allowed.has(field),
      `unexpected field "${field}" found in public session view`,
    );
  }
});

test("getCollaborationSession (internal) retains all fields including sessionSecret", async () => {
  const {
    createCollaborationSession,
    getCollaborationSession,
  } = await loadStore();

  const { session, sessionSecret } = await createCollaborationSession({
    title: "Internal helper audit",
    visibility: "public",
  });

  const internal = await getCollaborationSession(session.id);

  assert.ok(internal, "internal helper must return the full session object");
  assert.equal(
    internal.sessionSecret,
    sessionSecret,
    "internal helper must preserve sessionSecret for server-side callers",
  );
});

test("joinCollaborationSession for private session requires correct password", async () => {
  const {
    createCollaborationSession,
    getCollaborationSession,
    joinCollaborationSession,
  } = await loadStore();

  const { session } = await createCollaborationSession({
    title: "Join auth test",
    visibility: "private",
    password: "correct-password",
  });

  const stored = await getCollaborationSession(session.id);
  assert.equal(
    stored.passwordHash?.algorithm,
    "bcrypt",
    "new private sessions must use bcrypt password hashes",
  );
  assert.equal(
    stored.passwordHash?.workFactor,
    12,
    "bcrypt password metadata must include the configured work factor",
  );
  assert.ok(stored.passwordHash?.salt, "bcrypt password metadata must include the per-session salt");
  assert.notEqual(
    stored.passwordHash?.hash,
    legacySha256("correct-password"),
    "private session passwords must not be stored as unsalted SHA-256",
  );

  const denied = await joinCollaborationSession(session.id, { password: "wrong" });
  assert.equal(denied.status, 403, "wrong password must be rejected with 403");
  assert.ok(denied.error, "rejected join must include an error message");

  const granted = await joinCollaborationSession(session.id, { password: "correct-password" });
  assert.ok(!granted.error, "correct password must be accepted");
  assert.ok(granted.sessionSecret, "granted join must return sessionSecret to the joining user");
  assert.equal(
    granted.session?.passwordHash,
    undefined,
    "granted join must not expose passwordHash in session view",
  );
});

test("joinCollaborationSession migrates legacy SHA-256 password hashes after successful join", async () => {
  const {
    createCollaborationSession,
    getCollaborationSession,
    joinCollaborationSession,
  } = await loadStore();

  const { session } = await createCollaborationSession({
    title: "Legacy migration test",
    visibility: "private",
    password: "legacy-password",
  });

  const internal = await getCollaborationSession(session.id);
  internal.passwordHash = legacySha256("legacy-password");

  const denied = await joinCollaborationSession(session.id, { password: "wrong-password" });
  assert.equal(denied.status, 403, "wrong legacy password must still be rejected");

  const granted = await joinCollaborationSession(session.id, { password: "legacy-password" });
  assert.ok(!granted.error, "correct legacy password must be accepted during migration");

  const migrated = await getCollaborationSession(session.id);
  assert.equal(
    migrated.passwordHash?.algorithm,
    "bcrypt",
    "legacy SHA-256 hashes must be upgraded to bcrypt after successful verification",
  );
  assert.notEqual(
    migrated.passwordHash?.hash,
    legacySha256("legacy-password"),
    "migrated password hash must not remain unsalted SHA-256",
  );
});

test("joinCollaborationSession for missing session returns 404", async () => {
  const { joinCollaborationSession } = await loadStore();

  const result = await joinCollaborationSession("session_doesnotexist00");
  assert.equal(result.status, 404, "joining non-existent session must return 404");
});
