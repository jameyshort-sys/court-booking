import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { addDays } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

const prisma = new PrismaClient();
const TZ = "America/New_York";

function at(dayOffset: number, hour: number, minute = 0) {
  const todayKey = formatInTimeZone(new Date(), TZ, "yyyy-MM-dd");
  const noon = fromZonedTime(`${todayKey}T12:00:00`, TZ);
  const key = formatInTimeZone(addDays(noon, dayOffset), TZ, "yyyy-MM-dd");
  const hh = String(hour).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");
  return fromZonedTime(`${key}T${hh}:${mm}:00`, TZ);
}

async function main() {
  await prisma.reservation.deleteMany();
  await prisma.courtBlock.deleteMany();
  await prisma.memberImport.deleteMany();
  await prisma.clubRules.deleteMany();
  await prisma.court.deleteMany();
  await prisma.user.deleteMany();
  await prisma.club.deleteMany();

  const club = await prisma.club.create({
    data: {
      name: "Demo Club",
      city: "Sample City",
      state: "GA",
      timezone: TZ,
      contactEmail: "desk@democlub.local",
      rules: {
        create: {
          advanceDays: 14,
          openMinutes: 7 * 60,
          closeMinutes: 21 * 60,
          minDurationMinutes: 30,
          maxDurationMinutes: 180,
          maxConcurrentCourts: 2,
          cancelCutoffMinutes: 60,
        },
      },
    },
  });

  const tennis = Array.from({ length: 6 }, (_, i) => ({
    clubId: club.id,
    name: `Tennis ${i + 1}`,
    type: "TENNIS",
    sortOrder: i + 1,
    active: true,
  }));
  const pickleball = Array.from({ length: 3 }, (_, i) => ({
    clubId: club.id,
    name: `Pickleball ${i + 1}`,
    type: "PICKLEBALL",
    sortOrder: 10 + i + 1,
    active: true,
  }));

  await prisma.court.createMany({ data: [...tennis, ...pickleball] });
  const courts = await prisma.court.findMany({
    where: { clubId: club.id },
    orderBy: { sortOrder: "asc" },
  });

  const passwordHash = await bcrypt.hash("password123", 10);

  const admin = await prisma.user.create({
    data: {
      email: "admin@democlub.local",
      name: "Demo Admin",
      passwordHash,
      role: "ADMIN",
      status: "ACTIVE",
      clubId: club.id,
    },
  });

  const director = await prisma.user.create({
    data: {
      email: "director@democlub.local",
      name: "Demo Director",
      passwordHash,
      role: "DIRECTOR",
      status: "ACTIVE",
      clubId: club.id,
    },
  });

  await prisma.user.create({
    data: {
      email: "member@democlub.local",
      name: "Demo Member",
      passwordHash,
      role: "MEMBER",
      status: "ACTIVE",
      clubId: club.id,
    },
  });

  const member2 = await prisma.user.create({
    data: {
      email: "member2@democlub.local",
      name: "Demo Member Two",
      passwordHash,
      role: "MEMBER",
      status: "ACTIVE",
      clubId: club.id,
    },
  });

  await prisma.user.create({
    data: {
      email: "pending@democlub.local",
      name: "Pending Player",
      passwordHash: null,
      role: "MEMBER",
      status: "PENDING",
      invitedAt: new Date(),
      clubId: club.id,
    },
  });

  const member = await prisma.user.findUniqueOrThrow({
    where: { clubId_email: { clubId: club.id, email: "member@democlub.local" } },
  });

  const courtByName = Object.fromEntries(courts.map((court) => [court.name, court]));

  const samples: {
    courtName: string;
    userId: string;
    startAt: Date;
    endAt: Date;
    notes?: string;
  }[] = [
    {
      courtName: "Tennis 1",
      userId: member.id,
      startAt: at(0, 8),
      endAt: at(0, 9, 30),
      notes: "Morning hit",
    },
    {
      courtName: "Tennis 2",
      userId: member2.id,
      startAt: at(0, 10),
      endAt: at(0, 11, 30),
    },
    {
      courtName: "Tennis 3",
      userId: director.id,
      startAt: at(0, 9),
      endAt: at(0, 11),
      notes: "Team lesson — Green 3.0",
    },
    {
      courtName: "Tennis 4",
      userId: director.id,
      startAt: at(0, 9),
      endAt: at(0, 11),
      notes: "Team lesson — Green 3.0",
    },
    {
      courtName: "Pickleball 1",
      userId: member2.id,
      startAt: at(0, 17),
      endAt: at(0, 18, 30),
      notes: "Open play",
    },
    {
      courtName: "Tennis 1",
      userId: member.id,
      startAt: at(1, 18),
      endAt: at(1, 19, 30),
      notes: "Evening doubles",
    },
    {
      courtName: "Tennis 5",
      userId: member2.id,
      startAt: at(-1, 14),
      endAt: at(-1, 15, 30),
      notes: "Yesterday (past)",
    },
  ];

  for (const sample of samples) {
    const court = courtByName[sample.courtName];
    if (!court) continue;
    await prisma.reservation.create({
      data: {
        courtId: court.id,
        userId: sample.userId,
        startAt: sample.startAt,
        endAt: sample.endAt,
        notes: sample.notes,
      },
    });
  }

  const rainCourt = courtByName["Tennis 6"];
  if (rainCourt) {
    await prisma.courtBlock.create({
      data: {
        clubId: club.id,
        courtId: rainCourt.id,
        startAt: at(0, 12),
        endAt: at(0, 15),
        reason: "Rain-out",
        createdById: admin.id,
      },
    });
  }

  console.log("Seeded Demo Club");
  console.log("Logins (password for all active accounts: password123)");
  console.log("  admin@democlub.local     (ADMIN)");
  console.log("  director@democlub.local  (DIRECTOR)");
  console.log("  member@democlub.local    (MEMBER)");
  console.log("  member2@democlub.local   (MEMBER)");
  console.log("  pending@democlub.local   (PENDING, no password)");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
