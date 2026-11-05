import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { rmSync } from "node:fs";
import { before, test } from "node:test";
import * as XLSX from "xlsx";
import { addDays } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

const dbFile = "/tmp/court-booking-phase1.db";
process.env.DATABASE_URL = `file:${dbFile}`;
process.env.AUTH_SECRET = "test-secret-test-secret-test-secret-123456";
process.env.NEXTAUTH_URL = "http://localhost:3000";

rmSync(dbFile, { force: true });
rmSync(`${dbFile}-journal`, { force: true });
execFileSync(
  "npx",
  ["prisma", "db", "push", "--skip-generate", "--accept-data-loss"],
  {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
  },
);

type Service = typeof import("./admin-service");
type Logic = typeof import("./member-import-logic");
type Policy = typeof import("./booking-policy");
type PrismaModule = typeof import("./prisma");

let service: Service;
let logic: Logic;
let policy: Policy;
let prisma: PrismaModule["prisma"];

const TZ = "America/New_York";

function at(dayOffset: number, hour: number, minute = 0) {
  const today = formatInTimeZone(new Date(), TZ, "yyyy-MM-dd");
  const noon = fromZonedTime(`${today}T12:00:00`, TZ);
  const key = formatInTimeZone(addDays(noon, dayOffset), TZ, "yyyy-MM-dd");
  return fromZonedTime(
    `${key}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`,
    TZ,
  );
}

before(async () => {
  logic = await import("./member-import-logic");
  const prismaMod = await import("./prisma");
  prisma = prismaMod.prisma;
  service = await import("./admin-service");
  policy = await import("./booking-policy");
});

test("csv and spreadsheet parsing reports row-level problems", () => {
  const csv = Buffer.from(
    [
      "Email Address,Full Name,Member Role",
      "ada@example.com,Ada Lovelace,MEMBER",
      "not-an-email,Grace Hopper,MEMBER",
      ",No Email,MEMBER",
      "ada@example.com,Ada Again,MEMBER",
      "boss@example.com,Club Boss,CAPTAIN",
      "plain@example.com,Plain Player,",
      'quoted@example.com,"Hopper, Grace",ADMIN',
      "",
    ].join("\n"),
  );
  const parsed = logic.recordsFromGrid(
    csv
      .toString("utf8")
      .split("\n")
      .filter((line) => line.length > 0 || false)
      .map((line) => {
        // The service parser is xlsx; this test checks validation against a pre-split grid
        // only for the logic helper. Quoted commas are covered by the xlsx parse below.
        return line.split(",");
      }),
  );
  assert.equal(parsed.headers[0], "Email Address");

  const workbook = XLSX.read(csv, { type: "buffer", raw: false });
  const grid = XLSX.utils.sheet_to_json<string[]>(
    workbook.Sheets[workbook.SheetNames[0]],
    { header: 1, raw: false, defval: "" },
  ).map((row) => row.map((cell) => String(cell ?? "").trim()));
  const fromSheet = logic.recordsFromGrid(grid);
  const mapping = logic.detectMapping(fromSheet.headers);
  assert.ok(mapping);
  assert.equal(mapping.email, "Email Address");
  assert.equal(mapping.name, "Full Name");

  const rows = logic.validateMemberRows(
    fromSheet.headers,
    fromSheet.records,
    mapping,
    ["existing@example.com"],
  );
  const byEmail = new Map(rows.map((row) => [row.email || `row-${row.rowNumber}`, row]));
  const adaRows = rows.filter((row) => row.email === "ada@example.com");
  assert.equal(adaRows[0]?.status, "valid");
  assert.equal(adaRows[1]?.status, "duplicate");
  assert.equal(byEmail.get("not-an-email")?.status, "error");
  assert.equal(
    byEmail.get("boss@example.com")?.reason,
    "Unknown role. Use MEMBER, DIRECTOR, or ADMIN",
  );
  assert.equal(byEmail.get("plain@example.com")?.role, "MEMBER");
  assert.equal(byEmail.get("quoted@example.com")?.name, "Hopper, Grace");

  const duplicateClub = logic.validateMemberRows(
    ["email", "name", "role"],
    [{ rowNumber: 2, cells: ["existing@example.com", "Exists", "MEMBER"] }],
    { email: "email", name: "name", role: "role" },
    ["existing@example.com"],
  );
  assert.equal(duplicateClub[0].status, "duplicate");
  assert.match(duplicateClub[0].reason ?? "", /this club/);

  const tooMany = logic.assertImportSize(2001);
  assert.match(tooMany ?? "", /2000/);
  assert.equal(logic.detectMapping(["player", "notes"]), null);
});

test("admin services cover club setup, import, and rain-outs", async () => {
  const club = await prisma.club.create({
    data: {
      name: "Phase1 Test Club",
      city: "Sample City",
      state: "GA",
      timezone: TZ,
      rules: { create: {} },
    },
  });
  const admin = await prisma.user.create({
    data: {
      clubId: club.id,
      email: "admin@test.local",
      name: "Admin",
      role: "ADMIN",
      status: "ACTIVE",
      passwordHash: "x",
    },
  });
  const actor = {
    id: admin.id,
    email: admin.email,
    name: admin.name,
    role: "ADMIN" as const,
    clubId: club.id,
  };

  const created = await service.createAmenity(club.id, {
    name: "Court A",
    type: "tennis",
  });
  assert.equal(created.amenity.type, "TENNIS");
  assert.equal(created.amenity.active, true);
  const renamed = await service.updateAmenity(club.id, created.amenity.id, {
    name: "Center Court",
    sortOrder: 1,
  });
  assert.equal(renamed.amenity.name, "Center Court");
  const disabled = await service.disableAmenity(club.id, created.amenity.id);
  assert.equal(disabled.amenity.active, false);
  await service.updateAmenity(club.id, created.amenity.id, { active: true });

  await assert.rejects(
    () => service.updateRules(club.id, { openMinutes: 18 * 60, closeMinutes: 9 * 60 }),
    /Close time must be after open time/,
  );
  const rules = await service.updateRules(club.id, {
    advanceDays: 10,
    minDurationMinutes: 60,
    maxDurationMinutes: 120,
    maxConcurrentCourts: 1,
    cancelCutoffMinutes: 30,
  });
  assert.equal(rules.rules.advanceDays, 10);
  assert.equal(rules.rules.maxConcurrentCourts, 1);

  const settings = await service.updateClub(club.id, {
    name: "Phase1 Test Club",
    contactEmail: "desk@test.local",
    timezone: "America/Chicago",
  });
  assert.equal(settings.club.timezone, "America/Chicago");
  await service.updateClub(club.id, { timezone: TZ });

  const invited = await service.inviteMember(actor, {
    email: "New.Player@test.local",
    name: "New Player",
    role: "member",
  });
  assert.equal(invited.member.status, "PENDING");
  assert.equal(invited.member.email, "new.player@test.local");
  assert.equal(invited.emailDelivery, "not_configured");
  await assert.rejects(
    () => service.inviteMember(actor, { email: "new.player@test.local", name: "Again" }),
    /already belongs/,
  );

  const csv = Buffer.from(
    [
      "email,name,role",
      "new.player@test.local,New Player,MEMBER",
      "second@test.local,Second Player,DIRECTOR",
      "second@test.local,Second Duplicate,MEMBER",
      "bad-email,Nope,MEMBER",
      "third@test.local,,MEMBER",
    ].join("\n"),
  );
  const beforeCount = await prisma.user.count({ where: { clubId: club.id } });
  const preview = await service.previewMemberImport(
    club.id,
    { filename: "members.csv", buffer: csv },
    undefined,
  );
  assert.equal(await prisma.user.count({ where: { clubId: club.id } }), beforeCount);
  assert.equal(preview.summary.duplicate, 2);
  assert.equal(preview.summary.error, 2);
  assert.equal(preview.summary.valid, 1);

  const committed = await service.commitMemberImport(
    actor,
    { filename: "members.csv", buffer: csv },
    undefined,
    "active",
  );
  assert.equal(committed.imported, 1);
  assert.equal(committed.skipped, 2);
  assert.equal(committed.errored, 2);
  const second = await prisma.user.findFirst({
    where: { clubId: club.id, email: "second@test.local" },
  });
  if (!second) throw new Error("imported member missing");
  assert.equal(second.status, "ACTIVE");
  assert.equal(second.role, "DIRECTOR");
  assert.equal(second.passwordHash, null);

  const withPassword = await service.updateMember(actor, second.id, {
    password: "temporary1",
  });
  assert.equal(withPassword.member.hasPassword, true);
  const stored = await prisma.user.findUnique({ where: { id: second.id } });
  const bcrypt = await import("bcryptjs");
  assert.equal(await bcrypt.compare("temporary1", stored?.passwordHash ?? ""), true);
  await assert.rejects(
    () => service.updateMember(actor, second.id, { password: "short" }),
    /8 to 72/,
  );

  const again = await service.commitMemberImport(
    actor,
    { filename: "members.csv", buffer: csv },
    undefined,
    "invite",
  );
  assert.equal(again.imported, 0);
  assert.ok(again.skipped >= 2);

  const approved = await service.approveMember(actor, invited.member.id);
  assert.equal(approved.member.status, "ACTIVE");
  const rejectedInvite = await service.inviteMember(actor, {
    email: "reject.me@test.local",
    name: "Reject Me",
  });
  const rejected = await service.rejectMember(actor, rejectedInvite.member.id);
  assert.equal(rejected.member.status, "REJECTED");

  await assert.rejects(
    () => service.updateMember(actor, admin.id, { role: "MEMBER" }),
    /cannot change your own role/,
  );
  await assert.rejects(
    () => service.updateMember(actor, admin.id, { status: "DISABLED" }),
    /at least one active admin|cannot change your own/,
  );

  const block = await service.createBlock(actor, {
    courtId: created.amenity.id,
    date: formatInTimeZone(at(1, 12), TZ, "yyyy-MM-dd"),
    start: "12:00",
    end: "15:00",
    reason: "Rain-out",
  });
  assert.equal(block.block.reason, "Rain-out");
  const listed = await service.listBlocks(
    club.id,
    formatInTimeZone(at(1, 12), TZ, "yyyy-MM-dd"),
  );
  assert.equal(listed.blocks.length, 1);

  const member = await prisma.user.create({
    data: {
      clubId: club.id,
      email: "player@test.local",
      name: "Player",
      role: "MEMBER",
      status: "ACTIVE",
    },
  });
  const open = await policy.checkBooking({
    clubId: club.id,
    userId: member.id,
    courtId: created.amenity.id,
    startAt: at(1, 10),
    endAt: at(1, 11),
    isStaff: false,
  });
  assert.equal(open, null);

  const blocked = await policy.checkBooking({
    clubId: club.id,
    userId: member.id,
    courtId: created.amenity.id,
    startAt: at(1, 12),
    endAt: at(1, 13),
    isStaff: false,
  });
  assert.equal(blocked?.status, 409);

  const tooLong = await policy.checkBooking({
    clubId: club.id,
    userId: member.id,
    courtId: created.amenity.id,
    startAt: at(1, 16),
    endAt: at(1, 19),
    isStaff: false,
  });
  assert.match(tooLong?.error ?? "", /Maximum booking/);

  const staffLong = await policy.checkBooking({
    clubId: club.id,
    userId: admin.id,
    courtId: created.amenity.id,
    startAt: at(1, 16),
    endAt: at(1, 19),
    isStaff: true,
  });
  assert.equal(staffLong, null);

  await service.deleteBlock(club.id, block.block.id);
  const afterDelete = await service.listBlocks(club.id);
  assert.equal(afterDelete.blocks.some((item) => item.id === block.block.id), false);

  const dashboard = await service.getDashboard(club.id);
  assert.ok(dashboard.activeAmenities >= 1);
  assert.ok(dashboard.pending >= 0);
});
