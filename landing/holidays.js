// Malaysian public holidays for the Baltoratora landing calendar.
// Source: JPM cabinet gazette (HKA-2026 / HKA_2027), via
// ebright_public_holidays_seed_2026_2027.sql. Regions: Federal (nationwide),
// Selangor (SGR), Kuala Lumpur (KUL), Putrajaya (PJY).
//
// Merge rule applied to the seed: rows with the same date AND same name are
// collapsed into one entry whose `states` array lists every matching region.
// Federal entries have scope 'federal' and states []. Rows whose names differ
// (e.g. the 2026-02-02 Thaipusam variants) are kept separate.
//
// `provisional: true` = lunar-sighting / gazette-dependent; may shift.
// To add a future year, append rows here — no build step, no database.
const HOLIDAYS = [
  // ── 2026 · Federal ──────────────────────────────────────────────
  { date: '2026-02-17', name: 'Tahun Baharu Cina', scope: 'federal', states: [], provisional: false },
  { date: '2026-02-18', name: 'Tahun Baharu Cina (Hari Kedua)', scope: 'federal', states: [], provisional: false },
  { date: '2026-03-21', name: 'Hari Raya Puasa', scope: 'federal', states: [], provisional: true },
  { date: '2026-03-22', name: 'Hari Raya Puasa (Hari Kedua)', scope: 'federal', states: [], provisional: true },
  { date: '2026-05-01', name: 'Hari Pekerja', scope: 'federal', states: [], provisional: false },
  { date: '2026-05-27', name: 'Hari Raya Qurban', scope: 'federal', states: [], provisional: true },
  { date: '2026-05-28', name: 'Hari Raya Qurban (Hari Kedua)', scope: 'federal', states: [], provisional: true },
  { date: '2026-05-31', name: 'Hari Wesak', scope: 'federal', states: [], provisional: false },
  { date: '2026-06-01', name: 'Hari Keputeraan Rasmi Agong', scope: 'federal', states: [], provisional: false },
  { date: '2026-06-17', name: 'Awal Muharam (Maal Hijrah)', scope: 'federal', states: [], provisional: false },
  { date: '2026-08-25', name: 'Maulidur Rasul', scope: 'federal', states: [], provisional: false },
  { date: '2026-08-31', name: 'Hari Kebangsaan', scope: 'federal', states: [], provisional: false },
  { date: '2026-09-16', name: 'Hari Malaysia', scope: 'federal', states: [], provisional: false },
  { date: '2026-11-08', name: 'Hari Deepavali', scope: 'federal', states: [], provisional: true },
  { date: '2026-12-25', name: 'Hari Krismas', scope: 'federal', states: [], provisional: false },
  // ── 2026 · State ────────────────────────────────────────────────
  { date: '2026-02-02', name: 'Hari Thaipusam (cuti ganti — gazetted 1 Feb, Sun)', scope: 'state', states: ['SGR'], provisional: false },
  { date: '2026-02-02', name: 'Hari Wilayah Persekutuan + Hari Thaipusam (cuti ganti — gazetted 1 Feb, Sun)', scope: 'state', states: ['KUL', 'PJY'], provisional: false },
  { date: '2026-03-07', name: 'Hari Nuzul Al-Quran', scope: 'state', states: ['SGR', 'KUL', 'PJY'], provisional: false },
  { date: '2026-12-11', name: 'Hari Keputeraan Sultan Selangor', scope: 'state', states: ['SGR'], provisional: false },
  // ── 2027 · Federal ──────────────────────────────────────────────
  { date: '2027-02-06', name: 'Tahun Baharu Cina', scope: 'federal', states: [], provisional: false },
  { date: '2027-02-07', name: 'Tahun Baharu Cina (Hari Kedua)', scope: 'federal', states: [], provisional: false },
  { date: '2027-03-10', name: 'Hari Raya Puasa', scope: 'federal', states: [], provisional: true },
  { date: '2027-03-11', name: 'Hari Raya Puasa (Hari Kedua)', scope: 'federal', states: [], provisional: true },
  { date: '2027-05-01', name: 'Hari Pekerja', scope: 'federal', states: [], provisional: false },
  { date: '2027-05-17', name: 'Hari Raya Qurban', scope: 'federal', states: [], provisional: true },
  { date: '2027-05-18', name: 'Hari Raya Qurban (Hari Kedua)', scope: 'federal', states: [], provisional: true },
  { date: '2027-05-20', name: 'Hari Wesak', scope: 'federal', states: [], provisional: false },
  { date: '2027-06-06', name: 'Awal Muharam (Maal Hijrah)', scope: 'federal', states: [], provisional: false },
  { date: '2027-06-07', name: 'Hari Keputeraan Rasmi Agong', scope: 'federal', states: [], provisional: false },
  { date: '2027-08-15', name: 'Maulidur Rasul', scope: 'federal', states: [], provisional: false },
  { date: '2027-08-31', name: 'Hari Kebangsaan', scope: 'federal', states: [], provisional: false },
  { date: '2027-09-16', name: 'Hari Malaysia', scope: 'federal', states: [], provisional: false },
  { date: '2027-10-28', name: 'Hari Deepavali', scope: 'federal', states: [], provisional: true },
  { date: '2027-12-25', name: 'Hari Krismas', scope: 'federal', states: [], provisional: false },
  // ── 2027 · State ────────────────────────────────────────────────
  { date: '2027-01-22', name: 'Hari Thaipusam', scope: 'state', states: ['SGR', 'KUL', 'PJY'], provisional: false },
  { date: '2027-02-01', name: 'Hari Wilayah Persekutuan', scope: 'state', states: ['KUL', 'PJY'], provisional: false },
  { date: '2027-02-24', name: 'Hari Nuzul Al-Quran', scope: 'state', states: ['SGR', 'KUL', 'PJY'], provisional: false },
  { date: '2027-12-11', name: 'Hari Keputeraan Sultan Selangor (falls Saturday — confirm cuti ganti before use)', scope: 'state', states: ['SGR'], provisional: true },
];
