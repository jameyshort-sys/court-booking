import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { AdminError } from "@/lib/admin-error";
import {
  DEFAULT_RULES,
  isAmenityType,
  isImportMode,
  isMemberStatus,
  isRole,
  type ImportMode,
  type Role,
} from "@/lib/constants";
import {
  resolveMapping,
  summarizeRows,
  validateMemberRows,
  type ColumnMapping,
  type ImportRowResult,
} from "@/lib/member-import-logic";
import { parseMemberFile } from "@/lib/member-import-parse";
import { resolveBookingWindow } from "@/lib/parse-booking";
import {
  CLUB_TZ,
  dateKeyInClubTz,
  dayBoundsUtc,
  isValidTimeZone,
} from "@/lib/time";
import type { StaffActor } from "@/lib/staff";

const STATUS_ORDER = ["PENDING", "ACTIVE", "DISABLED", "REJECTED"];

function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

function requireObject(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new AdminError(400, "Invalid JSON");
  }
  return body as Record<string, unknown>;
}

export async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    return requireObject(await req.json());
  } catch (error) {
    if (error instanceof AdminError) throw error;
    throw new AdminError(400, "Invalid JSON");
  }
}

function serializeMember(user: {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  invitedAt: Date | null;
  createdAt: Date;
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status,
    invitedAt: user.invitedAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
  };
}

function serializeAmenity(court: {
  id: string;
  name: string;
  type: string;
  sortOrder: number;
  active: boolean;
}) {
  return {
    id: court.id,
    name: court.name,
    type: court.type,
    sortOrder: court.sortOrder,
    active: court.active,
  };
}

function serializeRules(rules: {
  advanceDays: number;
  openMinutes: number;
  closeMinutes: number;
  minDurationMinutes: number;
  maxDurationMinutes: number;
  maxConcurrentCourts: number;
  cancelCutoffMinutes: number;
}) {
  return {
    advanceDays: rules.advanceDays,
    openMinutes: rules.openMinutes,
    closeMinutes: rules.closeMinutes,
    minDurationMinutes: rules.minDurationMinutes,
    maxDurationMinutes: rules.maxDurationMinutes,
    maxConcurrentCourts: rules.maxConcurrentCourts,
    cancelCutoffMinutes: rules.cancelCutoffMinutes,
  };
}

async function clubTimezone(clubId: string): Promise<string> {
  const club = await prisma.club.findUnique({
    where: { id: clubId },
    select: { timezone: true },
  });
  if (!club) throw new AdminError(404, "Club not found");
  return club.timezone || CLUB_TZ;
}

export async function getClub(clubId: string) {
  const club = await prisma.club.findUnique({ where: { id: clubId } });
  if (!club) throw new AdminError(404, "Club not found");
  return {
    club: {
      id: club.id,
      name: club.name,
      city: club.city,
      state: club.state,
      timezone: club.timezone,
      contactEmail: club.contactEmail,
    },
  };
}

export async function updateClub(clubId: string, body: unknown) {
  const input = requireObject(body);
  const data: Prisma.ClubUpdateInput = {};

  if ("name" in input) {
    const name = cleanText(input.name, 120);
    if (!name) throw new AdminError(400, "Club name is required");
    data.name = name;
  }
  if ("city" in input) data.city = cleanText(input.city, 80);
  if ("state" in input) data.state = cleanText(input.state, 40);
  if ("timezone" in input) {
    const timezone = cleanText(input.timezone, 80);
    if (!timezone || !isValidTimeZone(timezone)) {
      throw new AdminError(400, "Choose a valid timezone");
    }
    data.timezone = timezone;
  }
  if ("contactEmail" in input) {
    const contact = cleanText(input.contactEmail, 254);
    if (contact && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)) {
      throw new AdminError(400, "Contact email is invalid");
    }
    data.contactEmail = contact?.toLowerCase() ?? null;
  }

  if (Object.keys(data).length === 0) {
    throw new AdminError(400, "Nothing to update");
  }

  const club = await prisma.club.update({ where: { id: clubId }, data });
  return {
    club: {
      id: club.id,
      name: club.name,
      city: club.city,
      state: club.state,
      timezone: club.timezone,
      contactEmail: club.contactEmail,
    },
  };
}

export async function getRules(clubId: string) {
  const rules = await prisma.clubRules.findUnique({ where: { clubId } });
  return { rules: serializeRules(rules ?? { ...DEFAULT_RULES }) };
}

function requireInt(value: unknown, label: string, min: number, max: number): number {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(number) || number < min || number > max) {
    throw new AdminError(400, `${label} must be a whole number from ${min} to ${max}`);
  }
  return number;
}

export async function updateRules(clubId: string, body: unknown) {
  const input = requireObject(body);
  const current = await prisma.clubRules.findUnique({ where: { clubId } });
  const next = {
    ...DEFAULT_RULES,
    ...(current
      ? {
          advanceDays: current.advanceDays,
          openMinutes: current.openMinutes,
          closeMinutes: current.closeMinutes,
          minDurationMinutes: current.minDurationMinutes,
          maxDurationMinutes: current.maxDurationMinutes,
          maxConcurrentCourts: current.maxConcurrentCourts,
          cancelCutoffMinutes: current.cancelCutoffMinutes,
        }
      : {}),
  };

  if ("advanceDays" in input) {
    next.advanceDays = requireInt(input.advanceDays, "Advance window", 0, 365);
  }
  if ("openMinutes" in input) {
    next.openMinutes = requireInt(input.openMinutes, "Open time", 0, 23 * 60 + 59);
  }
  if ("closeMinutes" in input) {
    next.closeMinutes = requireInt(input.closeMinutes, "Close time", 1, 24 * 60);
  }
  if ("minDurationMinutes" in input) {
    next.minDurationMinutes = requireInt(input.minDurationMinutes, "Minimum duration", 15, 24 * 60);
  }
  if ("maxDurationMinutes" in input) {
    next.maxDurationMinutes = requireInt(input.maxDurationMinutes, "Maximum duration", 15, 24 * 60);
  }
  if ("maxConcurrentCourts" in input) {
    next.maxConcurrentCourts = requireInt(input.maxConcurrentCourts, "Max concurrent courts", 1, 50);
  }
  if ("cancelCutoffMinutes" in input) {
    next.cancelCutoffMinutes = requireInt(input.cancelCutoffMinutes, "Cancel cutoff", 0, 7 * 24 * 60);
  }

  if (next.closeMinutes <= next.openMinutes) {
    throw new AdminError(400, "Close time must be after open time");
  }
  if (next.maxDurationMinutes < next.minDurationMinutes) {
    throw new AdminError(400, "Maximum duration must be at least the minimum");
  }
  if (next.minDurationMinutes > next.closeMinutes - next.openMinutes) {
    throw new AdminError(400, "Minimum duration is longer than the open window");
  }

  const rules = await prisma.clubRules.upsert({
    where: { clubId },
    create: { clubId, ...next },
    update: next,
  });
  return { rules: serializeRules(rules) };
}

export async function listAmenities(clubId: string) {
  const courts = await prisma.court.findMany({
    where: { clubId },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return { amenities: courts.map(serializeAmenity) };
}

export async function createAmenity(clubId: string, body: unknown) {
  const input = requireObject(body);
  const name = cleanText(input.name, 80);
  if (!name) throw new AdminError(400, "Amenity name is required");
  const type = String(input.type ?? "").toUpperCase();
  if (!isAmenityType(type)) {
    throw new AdminError(400, "Type must be TENNIS, PICKLEBALL, or OTHER");
  }

  let sortOrder: number;
  if (input.sortOrder == null || input.sortOrder === "") {
    const last = await prisma.court.findFirst({
      where: { clubId },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });
    sortOrder = (last?.sortOrder ?? 0) + 1;
  } else {
    sortOrder = requireInt(input.sortOrder, "Sort order", 0, 10000);
  }

  const active = input.active == null ? true : Boolean(input.active);
  const court = await prisma.court.create({
    data: { clubId, name, type, sortOrder, active },
  });
  return { amenity: serializeAmenity(court) };
}

async function amenityInClub(clubId: string, id: string) {
  const court = await prisma.court.findFirst({ where: { id, clubId } });
  if (!court) throw new AdminError(404, "Amenity not found");
  return court;
}

export async function getAmenity(clubId: string, id: string) {
  const court = await amenityInClub(clubId, id);
  return { amenity: serializeAmenity(court) };
}

export async function updateAmenity(clubId: string, id: string, body: unknown) {
  await amenityInClub(clubId, id);
  const input = requireObject(body);
  const data: Prisma.CourtUpdateInput = {};

  if ("name" in input) {
    const name = cleanText(input.name, 80);
    if (!name) throw new AdminError(400, "Amenity name is required");
    data.name = name;
  }
  if ("type" in input) {
    const type = String(input.type ?? "").toUpperCase();
    if (!isAmenityType(type)) {
      throw new AdminError(400, "Type must be TENNIS, PICKLEBALL, or OTHER");
    }
    data.type = type;
  }
  if ("sortOrder" in input) {
    data.sortOrder = requireInt(input.sortOrder, "Sort order", 0, 10000);
  }
  if ("active" in input) data.active = Boolean(input.active);

  if (Object.keys(data).length === 0) {
    throw new AdminError(400, "Nothing to update");
  }

  const court = await prisma.court.update({ where: { id }, data });
  return { amenity: serializeAmenity(court) };
}

export async function disableAmenity(clubId: string, id: string) {
  await amenityInClub(clubId, id);
  const court = await prisma.court.update({
    where: { id },
    data: { active: false },
  });
  return { amenity: serializeAmenity(court) };
}

export async function listMembers(clubId: string, status?: string | null) {
  const normalized = status?.trim().toUpperCase() ?? "";
  if (normalized && !isMemberStatus(normalized)) {
    throw new AdminError(400, "Unknown member status");
  }
  const members = await prisma.user.findMany({
    where: { clubId, ...(normalized ? { status: normalized } : {}) },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      invitedAt: true,
      createdAt: true,
    },
  });
  members.sort((a, b) => {
    const statusDelta = STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
    if (statusDelta !== 0) return statusDelta;
    return a.name.localeCompare(b.name);
  });
  return { members: members.map(serializeMember) };
}

async function memberInClub(clubId: string, id: string) {
  const member = await prisma.user.findFirst({ where: { id, clubId } });
  if (!member) throw new AdminError(404, "Member not found");
  return member;
}

function parseRole(value: unknown, fallback: Role = "MEMBER"): Role {
  if (value == null || value === "") return fallback;
  const role = String(value).trim().toUpperCase();
  if (!isRole(role)) {
    throw new AdminError(400, "Role must be MEMBER, DIRECTOR, or ADMIN");
  }
  return role;
}

async function assertKeepsAdmin(
  clubId: string,
  member: { id: string; role: string; status: string },
  nextRole: string,
  nextStatus: string,
) {
  const wasAdmin = member.role === "ADMIN" && member.status === "ACTIVE";
  const staysAdmin = nextRole === "ADMIN" && nextStatus === "ACTIVE";
  if (!wasAdmin || staysAdmin) return;
  const others = await prisma.user.count({
    where: {
      clubId,
      role: "ADMIN",
      status: "ACTIVE",
      id: { not: member.id },
    },
  });
  if (others === 0) {
    throw new AdminError(400, "The club needs at least one active admin");
  }
}

export async function inviteMember(actor: StaffActor, body: unknown) {
  const input = requireObject(body);
  const email = cleanText(input.email, 254)?.toLowerCase();
  const name = cleanText(input.name, 120);
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AdminError(400, "A valid email is required");
  }
  if (!name) throw new AdminError(400, "Name is required");
  const role = parseRole(input.role);

  const existing = await prisma.user.findUnique({
    where: { clubId_email: { clubId: actor.clubId, email } },
  });
  if (existing) {
    throw new AdminError(409, "That email already belongs to this club");
  }

  const member = await prisma.user.create({
    data: {
      clubId: actor.clubId,
      email,
      name,
      role,
      status: "PENDING",
      invitedAt: new Date(),
      passwordHash: null,
    },
  });
  return {
    member: serializeMember(member),
    emailDelivery: "not_configured" as const,
  };
}

export async function updateMember(
  actor: StaffActor,
  id: string,
  body: unknown,
) {
  const member = await memberInClub(actor.clubId, id);
  const input = requireObject(body);
  const nextRole = "role" in input ? parseRole(input.role, member.role as Role) : member.role;
  let nextStatus = member.status;

  if ("status" in input) {
    const status = String(input.status ?? "").toUpperCase();
    if (status !== "ACTIVE" && status !== "DISABLED") {
      throw new AdminError(400, "Status must be ACTIVE or DISABLED");
    }
    if (member.status === "PENDING" || member.status === "REJECTED") {
      throw new AdminError(
        400,
        "Approve or reject this member before changing active status",
      );
    }
    nextStatus = status;
  }

  if (actor.id === member.id && (nextRole !== member.role || nextStatus !== member.status)) {
    throw new AdminError(400, "You cannot change your own role or status");
  }

  await assertKeepsAdmin(actor.clubId, member, nextRole, nextStatus);

  const updated = await prisma.user.update({
    where: { id: member.id },
    data: { role: nextRole, status: nextStatus },
  });
  return { member: serializeMember(updated) };
}

export async function approveMember(actor: StaffActor, id: string) {
  const member = await memberInClub(actor.clubId, id);
  if (member.status !== "PENDING" && member.status !== "REJECTED") {
    throw new AdminError(400, "Only pending or rejected members can be approved");
  }
  const updated = await prisma.user.update({
    where: { id: member.id },
    data: { status: "ACTIVE" },
  });
  return { member: serializeMember(updated) };
}

export async function rejectMember(actor: StaffActor, id: string) {
  const member = await memberInClub(actor.clubId, id);
  if (actor.id === member.id) {
    throw new AdminError(400, "You cannot reject yourself");
  }
  if (member.status !== "PENDING") {
    throw new AdminError(
      400,
      "Only pending members can be rejected. Deactivate active members instead",
    );
  }
  const updated = await prisma.user.update({
    where: { id: member.id },
    data: { status: "REJECTED" },
  });
  return { member: serializeMember(updated) };
}

async function existingEmails(clubId: string): Promise<Set<string>> {
  const users = await prisma.user.findMany({
    where: { clubId },
    select: { email: true },
  });
  return new Set(users.map((user) => user.email.toLowerCase()));
}

function buildImportRows(
  parsed: { headers: string[]; records: { rowNumber: number; cells: string[] }[] },
  mappingInput: unknown,
  emails: Set<string>,
): { mapping: ColumnMapping; rows: ImportRowResult[] } {
  const mapping = resolveMapping(parsed.headers, mappingInput);
  if (!mapping) {
    throw new AdminError(422, "Map the email and name columns before continuing", {
      headers: parsed.headers,
    });
  }
  const rows = validateMemberRows(parsed.headers, parsed.records, mapping, emails);
  return { mapping, rows };
}

export async function previewMemberImport(
  clubId: string,
  file: { filename: string; buffer: Buffer },
  mappingInput: unknown,
) {
  const parsed = parseMemberFile(file.filename, file.buffer);
  const emails = await existingEmails(clubId);
  const { mapping, rows } = buildImportRows(parsed, mappingInput, emails);
  return {
    headers: parsed.headers,
    sheetName: parsed.sheetName,
    mapping,
    rows,
    summary: summarizeRows(rows),
  };
}

export async function commitMemberImport(
  actor: StaffActor,
  file: { filename: string; buffer: Buffer },
  mappingInput: unknown,
  modeInput: string,
) {
  const mode = modeInput || "pending";
  if (!isImportMode(mode)) {
    throw new AdminError(400, "Mode must be invite, active, or pending");
  }
  const parsed = parseMemberFile(file.filename, file.buffer);
  const mapping = resolveMapping(parsed.headers, mappingInput);
  if (!mapping) {
    throw new AdminError(422, "Map the email and name columns before continuing", {
      headers: parsed.headers,
    });
  }

  const status = mode === "active" ? "ACTIVE" : "PENDING";
  const invitedAt = mode === "invite" ? new Date() : null;

  return prisma.$transaction(async (tx) => {
    const current = await tx.user.findMany({
      where: { clubId: actor.clubId },
      select: { email: true },
    });
    const emails = new Set(current.map((user) => user.email.toLowerCase()));
    const rows = validateMemberRows(parsed.headers, parsed.records, mapping, emails);
    const valid = rows.filter((row) => row.status === "valid");

    for (const row of valid) {
      await tx.user.create({
        data: {
          clubId: actor.clubId,
          email: row.email,
          name: row.name,
          role: row.role,
          status,
          invitedAt,
          passwordHash: null,
        },
      });
    }

    const errored = rows.filter((row) => row.status === "error");
    const skipped = rows.filter((row) => row.status === "duplicate");
    const record = await tx.memberImport.create({
      data: {
        clubId: actor.clubId,
        createdById: actor.id,
        mode,
        totalRows: rows.length,
        imported: valid.length,
        skipped: skipped.length,
        errored: errored.length,
        errorRows: errored.map((row) => ({
          rowNumber: row.rowNumber,
          email: row.email,
          name: row.name,
          role: row.role,
          reason: row.reason,
        })) as Prisma.InputJsonValue,
      },
    });

    return {
      importId: record.id,
      mode: mode as ImportMode,
      imported: valid.length,
      skipped: skipped.length,
      errored: errored.length,
      total: rows.length,
      rows,
      summary: summarizeRows(rows),
      emailDelivery: mode === "invite" ? ("not_configured" as const) : null,
    };
  });
}

function serializeBlock(block: {
  id: string;
  courtId: string;
  startAt: Date;
  endAt: Date;
  reason: string;
  createdAt: Date;
  court: { name: string; type: string };
  createdBy: { name: string };
}) {
  return {
    id: block.id,
    courtId: block.courtId,
    courtName: block.court.name,
    courtType: block.court.type,
    startAt: block.startAt.toISOString(),
    endAt: block.endAt.toISOString(),
    reason: block.reason,
    createdByName: block.createdBy.name,
    createdAt: block.createdAt.toISOString(),
  };
}

const blockInclude = {
  court: { select: { name: true, type: true } },
  createdBy: { select: { name: true } },
} as const;

export async function listBlocks(clubId: string, date?: string | null) {
  const tz = await clubTimezone(clubId);
  const where: Prisma.CourtBlockWhereInput = { clubId };
  if (date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new AdminError(400, "Invalid date");
    }
    const bounds = dayBoundsUtc(date, tz);
    where.startAt = { lt: bounds.end };
    where.endAt = { gt: bounds.start };
  } else {
    const today = dateKeyInClubTz(new Date(), tz);
    where.endAt = { gt: dayBoundsUtc(today, tz).start };
  }

  const blocks = await prisma.courtBlock.findMany({
    where,
    include: blockInclude,
    orderBy: [{ startAt: "asc" }, { court: { sortOrder: "asc" } }],
  });
  return { blocks: blocks.map(serializeBlock), timezone: tz };
}

export async function createBlock(actor: StaffActor, body: unknown) {
  const input = requireObject(body);
  const courtId = cleanText(input.courtId, 80);
  if (!courtId) throw new AdminError(400, "Choose an amenity");
  const court = await prisma.court.findFirst({
    where: { id: courtId, clubId: actor.clubId },
  });
  if (!court) throw new AdminError(404, "Amenity not found");

  const reason = cleanText(input.reason, 300);
  if (!reason) throw new AdminError(400, "A reason is required");

  const tz = await clubTimezone(actor.clubId);
  const window = resolveBookingWindow(
    {
      date: typeof input.date === "string" ? input.date : undefined,
      start: typeof input.start === "string" ? input.start : undefined,
      end: typeof input.end === "string" ? input.end : undefined,
      startAt: typeof input.startAt === "string" ? input.startAt : undefined,
      endAt: typeof input.endAt === "string" ? input.endAt : undefined,
    },
    tz,
  );
  if ("error" in window) throw new AdminError(400, window.error);
  if (window.endAt <= window.startAt) {
    throw new AdminError(400, "End must be after start");
  }
  const span = window.endAt.getTime() - window.startAt.getTime();
  if (span > 14 * 24 * 60 * 60 * 1000) {
    throw new AdminError(400, "A block cannot be longer than 14 days");
  }

  const block = await prisma.courtBlock.create({
    data: {
      clubId: actor.clubId,
      courtId,
      startAt: window.startAt,
      endAt: window.endAt,
      reason,
      createdById: actor.id,
    },
    include: blockInclude,
  });
  return { block: serializeBlock(block) };
}

export async function deleteBlock(clubId: string, id: string) {
  const block = await prisma.courtBlock.findFirst({ where: { id, clubId } });
  if (!block) throw new AdminError(404, "Block not found");
  await prisma.courtBlock.delete({ where: { id } });
  return { ok: true };
}

export async function getDashboard(clubId: string) {
  const tz = await clubTimezone(clubId);
  const today = dateKeyInClubTz(new Date(), tz);
  const bounds = dayBoundsUtc(today, tz);
  const [pending, activeMembers, activeAmenities, rules, blocks, bookings] =
    await Promise.all([
      prisma.user.count({ where: { clubId, status: "PENDING" } }),
      prisma.user.count({ where: { clubId, status: "ACTIVE" } }),
      prisma.court.count({ where: { clubId, active: true } }),
      prisma.clubRules.findUnique({ where: { clubId } }),
      prisma.courtBlock.findMany({
        where: {
          clubId,
          startAt: { lt: bounds.end },
          endAt: { gt: bounds.start },
        },
        include: blockInclude,
        orderBy: { startAt: "asc" },
      }),
      prisma.reservation.count({
        where: {
          canceledAt: null,
          startAt: { lt: bounds.end },
          endAt: { gt: bounds.start },
          court: { clubId },
        },
      }),
    ]);

  return {
    timezone: tz,
    date: today,
    pending,
    activeMembers,
    activeAmenities,
    rules: serializeRules(rules ?? { ...DEFAULT_RULES }),
    todayBookings: bookings,
    todayBlocks: blocks.map(serializeBlock),
  };
}

export async function getScheduleOverview(clubId: string, dateKey: string) {
  const tz = await clubTimezone(clubId);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    throw new AdminError(400, "Invalid date");
  }
  const bounds = dayBoundsUtc(dateKey, tz);
  const courts = await prisma.court.findMany({
    where: { clubId },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      reservations: {
        where: {
          canceledAt: null,
          startAt: { lt: bounds.end },
          endAt: { gt: bounds.start },
        },
        include: { user: { select: { name: true, email: true } } },
        orderBy: { startAt: "asc" },
      },
      blocks: {
        where: {
          startAt: { lt: bounds.end },
          endAt: { gt: bounds.start },
        },
        orderBy: { startAt: "asc" },
      },
    },
  });

  const rows: {
    kind: "booking" | "block";
    id: string;
    courtName: string;
    courtType: string;
    active: boolean;
    startAt: string;
    endAt: string;
    label: string;
    detail: string | null;
  }[] = [];

  for (const court of courts) {
    for (const reservation of court.reservations) {
      rows.push({
        kind: "booking",
        id: reservation.id,
        courtName: court.name,
        courtType: court.type,
        active: court.active,
        startAt: reservation.startAt.toISOString(),
        endAt: reservation.endAt.toISOString(),
        label: reservation.user.name,
        detail: reservation.notes,
      });
    }
    for (const block of court.blocks) {
      rows.push({
        kind: "block",
        id: block.id,
        courtName: court.name,
        courtType: court.type,
        active: court.active,
        startAt: block.startAt.toISOString(),
        endAt: block.endAt.toISOString(),
        label: block.reason,
        detail: null,
      });
    }
  }

  rows.sort((a, b) => a.startAt.localeCompare(b.startAt) || a.courtName.localeCompare(b.courtName));
  return { date: dateKey, timezone: tz, rows };
}
