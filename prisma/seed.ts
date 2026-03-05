/**
 * Seed script: imports boats, squads, equipment, oar sets, and time slots
 * from the LRC Boat Bookings XLS data.
 *
 * Run with: npx tsx prisma/seed.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // ─── Squads ─────────────────────────────────────────────────
  const squadNames = [
    "HARPOONS",
    "AVIANS",
    "TRIDENTS",
    "F TROOP",
    "BULLSHARKS",
    "HELLS BELLES",
    "GOLDIES",
    "ROWMANTICS",
    "REXES",
    "MEN'S SCULLERS",
    "JUNIORS",
    "S JAQUES SCULLERS",
  ];

  const squads: Record<string, string> = {};
  for (const name of squadNames) {
    const squad = await prisma.squad.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    squads[name] = squad.id;
  }
  console.log(`  ✓ ${squadNames.length} squads`);

  // ─── Club Boats ─────────────────────────────────────────────
  // Extracted from XLS rows 7-67. Classification is based on (INVITE ONLY) → black, else green.
  // (experienced scullers only) → black. (OUTSIDE) → isOutside=true.

  type BoatSeed = {
    name: string;
    boatType: string;
    avgWeightKg: number | null;
    classification: "black" | "green";
    isOutside: boolean;
    responsibleSquad: string | null;
    responsiblePerson: string | null;
    notes: string | null;
  };

  const clubBoats: BoatSeed[] = [
    // ── 8+ Eights ──
    { name: "Premiers 2024", boatType: "8+", avgWeightKg: null, classification: "black", isOutside: false, responsibleSquad: null, responsiblePerson: "JEN ZONGOR", notes: "INVITE ONLY" },
    { name: "Yarra 23", boatType: "8+", avgWeightKg: null, classification: "black", isOutside: false, responsibleSquad: "HARPOONS", responsiblePerson: null, notes: "INVITE ONLY" },
    { name: "Dean Patterson", boatType: "8+", avgWeightKg: 92.5, classification: "black", isOutside: false, responsibleSquad: "AVIANS", responsiblePerson: null, notes: "INVITE ONLY. Weight range 85-100" },
    { name: "Iron Cove", boatType: "8+", avgWeightKg: 85, classification: "green", isOutside: false, responsibleSquad: "TRIDENTS", responsiblePerson: null, notes: null },
    { name: "BoomalaKKar (StP)", boatType: "8+", avgWeightKg: 95, classification: "green", isOutside: false, responsibleSquad: "F TROOP", responsiblePerson: null, notes: null },
    { name: "Sam Mackenzie", boatType: "8+", avgWeightKg: 80, classification: "green", isOutside: false, responsibleSquad: "BULLSHARKS", responsiblePerson: null, notes: null },
    { name: "LUOR", boatType: "8+", avgWeightKg: null, classification: "black", isOutside: false, responsibleSquad: null, responsiblePerson: null, notes: "INVITE ONLY" },
    { name: "Angela Conry", boatType: "8+", avgWeightKg: 75, classification: "green", isOutside: false, responsibleSquad: null, responsiblePerson: null, notes: null },
    { name: "Justin Milne", boatType: "8+", avgWeightKg: 77, classification: "green", isOutside: false, responsibleSquad: "HELLS BELLES", responsiblePerson: null, notes: null },
    { name: "Margot Simmington", boatType: "8+", avgWeightKg: 75, classification: "green", isOutside: false, responsibleSquad: null, responsiblePerson: null, notes: null },
    { name: "Tim Clare", boatType: "8+", avgWeightKg: 85, classification: "green", isOutside: true, responsibleSquad: null, responsiblePerson: "MADDIE BORREY", notes: "OUTSIDE" },
    { name: "David Bodell", boatType: "8+", avgWeightKg: 85, classification: "green", isOutside: true, responsibleSquad: "F TROOP", responsiblePerson: null, notes: "OUTSIDE" },
    { name: "Genesis", boatType: "8+", avgWeightKg: 75, classification: "green", isOutside: false, responsibleSquad: null, responsiblePerson: "KERRY THORN", notes: null },
    { name: "Michael Bath", boatType: "8+", avgWeightKg: 85, classification: "green", isOutside: true, responsibleSquad: "REXES", responsiblePerson: null, notes: "OUTSIDE" },

    // ── 4x/4- Quads/Fours ──
    { name: "Deanna Fekete", boatType: "4x/4-/4+", avgWeightKg: 90, classification: "black", isOutside: false, responsibleSquad: "AVIANS", responsiblePerson: null, notes: "INVITE ONLY" },
    { name: "Christiaan Fitzsimon", boatType: "4x/4-", avgWeightKg: 92.5, classification: "green", isOutside: false, responsibleSquad: "MEN'S SCULLERS", responsiblePerson: null, notes: "Weight range 90-95" },
    { name: "Nancy Wahlquist", boatType: "4x/4-", avgWeightKg: 87.5, classification: "black", isOutside: false, responsibleSquad: "HARPOONS", responsiblePerson: null, notes: "INVITE ONLY. Weight range 80-95" },
    { name: "Daniela Borgert", boatType: "4x/4-", avgWeightKg: 67.5, classification: "green", isOutside: false, responsibleSquad: null, responsiblePerson: "KAROLINA K", notes: "Weight range 65-70" },
    { name: "Anna Cicognani", boatType: "4x/4-", avgWeightKg: 75, classification: "black", isOutside: false, responsibleSquad: null, responsiblePerson: "JEN Z/DANIELA/NIKI", notes: "INVITE ONLY" },
    { name: "Wade Hewett", boatType: "4x/4-", avgWeightKg: 70, classification: "green", isOutside: false, responsibleSquad: null, responsiblePerson: "JACK CREW", notes: null },
    { name: "Premiers 09", boatType: "4x/4-/4+", avgWeightKg: 70, classification: "green", isOutside: false, responsibleSquad: null, responsiblePerson: "JEN Z", notes: null },
    { name: "Premiers 2014", boatType: "4x/4-/4+", avgWeightKg: 80, classification: "green", isOutside: false, responsibleSquad: "JUNIORS", responsiblePerson: null, notes: "NOT ROWABLE AS SWEEP - OK AS QUAD" },
    { name: "Charles Bartlett", boatType: "4x/4-", avgWeightKg: 80, classification: "green", isOutside: false, responsibleSquad: null, responsiblePerson: "MATTANI/WAINBERG", notes: null },
    { name: "Frank & Kerry Thorn", boatType: "4x/4-", avgWeightKg: 75, classification: "green", isOutside: false, responsibleSquad: "GOLDIES", responsiblePerson: null, notes: null },
    { name: "Steven Duff", boatType: "4x/4-", avgWeightKg: 80, classification: "green", isOutside: false, responsibleSquad: null, responsiblePerson: null, notes: null },
    { name: "Bohemia 2014", boatType: "4x/4-", avgWeightKg: 70, classification: "green", isOutside: false, responsibleSquad: "HELLS BELLES", responsiblePerson: null, notes: null },
    { name: "David Rosenfeld", boatType: "4x/4-", avgWeightKg: 75, classification: "green", isOutside: false, responsibleSquad: "HELLS BELLES", responsiblePerson: null, notes: null },
    { name: "Alex Kempson", boatType: "4x+/4+", avgWeightKg: 82.5, classification: "green", isOutside: false, responsibleSquad: "ROWMANTICS", responsiblePerson: null, notes: "Weight range 80-85" },

    // ── 2-/x Pairs ──
    { name: "Rob Gilmour", boatType: "2-/x", avgWeightKg: null, classification: "black", isOutside: false, responsibleSquad: null, responsiblePerson: null, notes: "INVITE ONLY" },
    { name: "Bob Kelsall HWT", boatType: "2-/x", avgWeightKg: 90, classification: "black", isOutside: false, responsibleSquad: "HARPOONS", responsiblePerson: null, notes: "INVITE ONLY" },
    { name: "Kerry Thorn LWT", boatType: "2-/x", avgWeightKg: 65, classification: "black", isOutside: false, responsibleSquad: null, responsiblePerson: "DANIELA/JEN Z", notes: "INVITE ONLY. LWT" },
    { name: "Peter Gilder", boatType: "2-/x", avgWeightKg: 75, classification: "black", isOutside: false, responsibleSquad: null, responsiblePerson: "BELINDA/JANE H", notes: "INVITE ONLY" },
    { name: "Anne Parbury", boatType: "2-/x", avgWeightKg: 85, classification: "green", isOutside: false, responsibleSquad: "BULLSHARKS", responsiblePerson: null, notes: null },
    { name: "Belinda Brigham", boatType: "2-/x", avgWeightKg: 80, classification: "green", isOutside: false, responsibleSquad: "JUNIORS", responsiblePerson: null, notes: null },
    { name: "Jane Hutchison", boatType: "2-/x", avgWeightKg: 75, classification: "green", isOutside: false, responsibleSquad: null, responsiblePerson: "KK/KRISTANE", notes: null },
    { name: "Mick Lowrey", boatType: "2-/x", avgWeightKg: 75, classification: "green", isOutside: false, responsibleSquad: null, responsiblePerson: "EM/SUSAN H", notes: null },
    { name: "Miss Leichhardt", boatType: "2x", avgWeightKg: 60, classification: "green", isOutside: false, responsibleSquad: null, responsiblePerson: "LISA/SHANELLE", notes: null },
    { name: "Geoff Williamson", boatType: "2x", avgWeightKg: 70, classification: "green", isOutside: false, responsibleSquad: null, responsiblePerson: "KATHRYN/PATRICIA", notes: null },
    { name: "LRC Masters", boatType: "2-/x", avgWeightKg: 85, classification: "green", isOutside: false, responsibleSquad: "MEN'S SCULLERS", responsiblePerson: null, notes: null },
    { name: "Ted Curtain IV", boatType: "2-/x", avgWeightKg: 85, classification: "green", isOutside: false, responsibleSquad: null, responsiblePerson: "BRIAN DUNN", notes: null },
    { name: "Rod Richardson", boatType: "2-/x", avgWeightKg: 75, classification: "green", isOutside: false, responsibleSquad: null, responsiblePerson: "KATHRYN AUSTIN", notes: null },

    // ── 1x Singles ──
    { name: "Roger Bligh", boatType: "1x", avgWeightKg: null, classification: "black", isOutside: false, responsibleSquad: null, responsiblePerson: "RESTRICTED USE", notes: "INVITE ONLY" },
    { name: "Mercury", boatType: "1x", avgWeightKg: 90, classification: "green", isOutside: false, responsibleSquad: "HARPOONS", responsiblePerson: null, notes: null },
    { name: "Ripple", boatType: "1x", avgWeightKg: 75, classification: "black", isOutside: false, responsibleSquad: "JUNIORS", responsiblePerson: null, notes: "INVITE ONLY" },
    { name: "Shamrock", boatType: "1x", avgWeightKg: 90, classification: "black", isOutside: false, responsibleSquad: null, responsiblePerson: "NIKI LOPRESTI", notes: "INVITE ONLY" },
    { name: "Victory", boatType: "1x", avgWeightKg: 60, classification: "black", isOutside: false, responsibleSquad: "JUNIORS", responsiblePerson: null, notes: "INVITE ONLY" },
    { name: "Rob Tiley", boatType: "1x", avgWeightKg: 82.5, classification: "black", isOutside: false, responsibleSquad: "BULLSHARKS", responsiblePerson: null, notes: "INVITE ONLY. Weight range 80-85" },
    { name: "Obsession", boatType: "1x", avgWeightKg: 65, classification: "black", isOutside: false, responsibleSquad: null, responsiblePerson: "JEN ZONGER", notes: "INVITE ONLY" },
    { name: "Miss Kate Chadwick", boatType: "1x", avgWeightKg: 85, classification: "green", isOutside: false, responsibleSquad: "AVIANS", responsiblePerson: null, notes: null },
    { name: "Onno van Ewyk", boatType: "1x", avgWeightKg: 60, classification: "green", isOutside: false, responsibleSquad: "JUNIORS", responsiblePerson: null, notes: null },
    { name: "Tim Tindale", boatType: "1x", avgWeightKg: 75, classification: "green", isOutside: false, responsibleSquad: "JUNIORS", responsiblePerson: null, notes: null },
    { name: "Tony Potter", boatType: "1x", avgWeightKg: 80, classification: "green", isOutside: true, responsibleSquad: "F TROOP", responsiblePerson: null, notes: "OUTSIDE" },
    { name: "Virginia van Ewyk", boatType: "1x", avgWeightKg: 62.5, classification: "black", isOutside: false, responsibleSquad: null, responsiblePerson: "MADDIE BORREY", notes: "experienced scullers only. Weight range 60-65" },
    { name: "David Ross", boatType: "1x", avgWeightKg: 72.5, classification: "black", isOutside: false, responsibleSquad: null, responsiblePerson: "CARMEL TAYLOR", notes: "experienced scullers only. Weight range 70-75" },
    { name: "Steve Sherry", boatType: "1x", avgWeightKg: 82.5, classification: "black", isOutside: false, responsibleSquad: null, responsiblePerson: "ADAM WAINBERG", notes: "experienced scullers only. Weight range 80-85" },
    { name: "Barry Moynahan", boatType: "1x", avgWeightKg: 92.5, classification: "black", isOutside: false, responsibleSquad: null, responsiblePerson: "CHRIS GRAY", notes: "experienced scullers only. Weight range 90-95" },
    { name: "Rex Chadwick", boatType: "1x", avgWeightKg: 90, classification: "green", isOutside: false, responsibleSquad: "MEN'S SCULLERS", responsiblePerson: null, notes: null },
    { name: "Lionel Robberds", boatType: "1x", avgWeightKg: 75, classification: "green", isOutside: false, responsibleSquad: null, responsiblePerson: null, notes: null },
    { name: "Geoff Rich", boatType: "1x", avgWeightKg: 70, classification: "green", isOutside: false, responsibleSquad: "JUNIORS", responsiblePerson: null, notes: null },
    { name: "Margaret Bailey", boatType: "1x", avgWeightKg: 70, classification: "green", isOutside: false, responsibleSquad: "JUNIORS", responsiblePerson: null, notes: null },
    { name: "LRC Juniors", boatType: "1x", avgWeightKg: 60, classification: "green", isOutside: false, responsibleSquad: "S JAQUES SCULLERS", responsiblePerson: null, notes: null },
  ];

  for (let i = 0; i < clubBoats.length; i++) {
    const b = clubBoats[i];
    await prisma.boat.upsert({
      where: { id: `club-boat-${i}` },
      update: {},
      create: {
        id: `club-boat-${i}`,
        name: b.name,
        boatType: b.boatType,
        category: "club",
        classification: b.classification,
        avgWeightKg: b.avgWeightKg,
        isOutside: b.isOutside,
        responsibleSquadId: b.responsibleSquad ? squads[b.responsibleSquad] : null,
        responsiblePerson: b.responsiblePerson,
        displayOrder: i,
        notes: b.notes,
      },
    });
  }
  console.log(`  ✓ ${clubBoats.length} club boats`);

  // ─── Private Boats ──────────────────────────────────────────
  const privateBoatOwners = [
    "Wendy Miller", "Leslie Howatt", "Em Barac", "Tubby", "Simon Miller",
    "Kerry Thorn", "Lynette Wherry", "van Ewyks", "Deanna Fekete", "Di Jacob",
    "Charles Buzacott", "Al McHugh", "Richard Medway", "Terry Bridges",
    "Ed Cutcliffe", "Edith de Boer", "Doreen Borg", "Aydn Shepard",
    "Dean Patterson", "Anna Foley", "Mark Brooks", "Nivi Masserek",
    "Daniela Borgert", "Angela Conry", "Kristane Foxton", "Luca Wilson",
    "Sue-Ella Day", "David Bodell", "Rob Tiley", "Christiaan Fitzsimon",
  ];

  for (let i = 0; i < privateBoatOwners.length; i++) {
    await prisma.boat.upsert({
      where: { id: `private-boat-${i}` },
      update: {},
      create: {
        id: `private-boat-${i}`,
        name: privateBoatOwners[i],
        boatType: "1x",
        category: "private",
        classification: "green",
        displayOrder: 100 + i,
        notes: "Private boat - owner only",
      },
    });
  }

  // Private sculling boats
  const privateSculls = [
    { name: "Kerry 2x", type: "2x" },
    { name: "Simon 2x", type: "2x" },
    { name: "Rick 2x", type: "2x" },
    { name: "Nick Martin 2-/2x", type: "2x" },
    { name: "Symphony Kerry 4x", type: "4x" },
  ];

  for (let i = 0; i < privateSculls.length; i++) {
    await prisma.boat.upsert({
      where: { id: `private-scull-${i}` },
      update: {},
      create: {
        id: `private-scull-${i}`,
        name: privateSculls[i].name,
        boatType: privateSculls[i].type,
        category: "private",
        classification: "green",
        displayOrder: 130 + i,
        notes: "Private boat - owner only",
      },
    });
  }
  console.log(`  ✓ ${privateBoatOwners.length + privateSculls.length} private boats`);

  // ─── Tinnies (Coach Boats) ──────────────────────────────────
  const tinnies = [
    { name: "Tinny 1 (8hp)", hp: 8 },
    { name: "Tinny 2 (15hp)", hp: 15 },
    { name: "Tinny 3 (15hp)", hp: 15 },
    { name: "Tinny 4 (15hp)", hp: 15 },
    { name: "Tinny 5 (15hp)", hp: 15 },
  ];

  for (let i = 0; i < tinnies.length; i++) {
    await prisma.boat.upsert({
      where: { id: `tinny-${i}` },
      update: {},
      create: {
        id: `tinny-${i}`,
        name: tinnies[i].name,
        boatType: "tinny",
        category: "tinny",
        classification: "green",
        displayOrder: 200 + i,
        notes: `${tinnies[i].hp}hp motor. Coach counted in shed total.`,
      },
    });
  }
  console.log(`  ✓ ${tinnies.length} tinnies`);

  // ─── Oar Sets ───────────────────────────────────────────────
  const oarSetNames = ["Set A", "Set B", "Set C", "Set D", "Set E", "Set F"];
  for (const name of oarSetNames) {
    await prisma.oarSet.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log(`  ✓ ${oarSetNames.length} oar sets`);

  // ─── Equipment ──────────────────────────────────────────────
  // 10 ergs, 4 bikes, 4 gym spots
  for (let i = 1; i <= 10; i++) {
    await prisma.equipment.upsert({
      where: { type_number: { type: "erg", number: i } },
      update: {},
      create: { type: "erg", number: i },
    });
  }
  for (let i = 1; i <= 4; i++) {
    await prisma.equipment.upsert({
      where: { type_number: { type: "bike", number: i } },
      update: {},
      create: { type: "bike", number: i },
    });
  }
  for (let i = 1; i <= 4; i++) {
    await prisma.equipment.upsert({
      where: { type_number: { type: "gym", number: i } },
      update: {},
      create: { type: "gym", number: i },
    });
  }
  console.log("  ✓ 18 equipment (10 ergs, 4 bikes, 4 gym)");

  // ─── Time Slots ─────────────────────────────────────────────
  const weekdaySlots = [
    { slotNumber: 1, label: "5:00am ON", startTime: "05:00", endTime: "05:30" },
    { slotNumber: 2, label: "5:30am ON", startTime: "05:30", endTime: "06:00" },
    { slotNumber: 3, label: "6:00am ON", startTime: "06:00", endTime: "06:30" },
    { slotNumber: 4, label: "6:30am ON", startTime: "06:30", endTime: "07:00" },
    { slotNumber: 5, label: "7:00am ON", startTime: "07:00", endTime: "07:30" },
    { slotNumber: 6, label: "7:30am ON", startTime: "07:30", endTime: "08:00" },
    { slotNumber: 7, label: "8:00am - 4:30pm", startTime: "08:00", endTime: "16:30" },
    { slotNumber: 8, label: "4:30pm - 6:00pm", startTime: "16:30", endTime: "18:00" },
    { slotNumber: 9, label: "6:15pm onward", startTime: "18:15", endTime: "21:00" },
  ];

  for (const slot of weekdaySlots) {
    await prisma.timeSlot.upsert({
      where: { slotNumber_isWeekend: { slotNumber: slot.slotNumber, isWeekend: false } },
      update: {},
      create: { ...slot, isWeekend: false },
    });
    // Weekend slots have same structure but different access rules (enforced in app logic)
    await prisma.timeSlot.upsert({
      where: { slotNumber_isWeekend: { slotNumber: slot.slotNumber, isWeekend: true } },
      update: {},
      create: { ...slot, isWeekend: true },
    });
  }
  console.log("  ✓ 18 time slots (9 weekday, 9 weekend)");

  console.log("\nSeed complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
