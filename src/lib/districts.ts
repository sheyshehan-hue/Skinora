/** Sri Lanka's 25 districts with delivery terms. Used by the seed and as a fallback when the DB has no zones. */
export type Zone = {
  district: string;
  province: string;
  standardFee: number;
  expressFee: number | null;
  sameDay: boolean;
  nextDay: boolean;
  etaDaysMin: number;
  etaDaysMax: number;
};

const z = (district: string, province: string, standardFee: number, etaDaysMin: number, etaDaysMax: number, extra: Partial<Zone> = {}): Zone => ({
  district,
  province,
  standardFee,
  expressFee: null,
  sameDay: false,
  nextDay: false,
  etaDaysMin,
  etaDaysMax,
  ...extra,
});

export const DISTRICTS: Zone[] = [
  z("Colombo", "Western", 350, 1, 1, { sameDay: true, nextDay: true, expressFee: 750 }),
  z("Gampaha", "Western", 450, 1, 2, { nextDay: true, expressFee: 650 }),
  z("Kalutara", "Western", 450, 1, 2, { nextDay: true, expressFee: 650 }),
  z("Kandy", "Central", 550, 2, 3, { nextDay: true, expressFee: 850 }),
  z("Matale", "Central", 600, 2, 4),
  z("Nuwara Eliya", "Central", 650, 2, 4),
  z("Galle", "Southern", 550, 2, 3, { nextDay: true, expressFee: 850 }),
  z("Matara", "Southern", 600, 2, 3),
  z("Hambantota", "Southern", 650, 2, 4),
  z("Jaffna", "Northern", 750, 3, 5),
  z("Kilinochchi", "Northern", 750, 3, 5),
  z("Mannar", "Northern", 750, 3, 5),
  z("Vavuniya", "Northern", 700, 3, 5),
  z("Mullaitivu", "Northern", 750, 3, 5),
  z("Batticaloa", "Eastern", 700, 3, 5),
  z("Ampara", "Eastern", 700, 3, 5),
  z("Trincomalee", "Eastern", 700, 3, 5),
  z("Kurunegala", "North Western", 550, 2, 3, { nextDay: true, expressFee: 850 }),
  z("Puttalam", "North Western", 600, 2, 4),
  z("Anuradhapura", "North Central", 650, 2, 4),
  z("Polonnaruwa", "North Central", 650, 3, 4),
  z("Badulla", "Uva", 650, 3, 4),
  z("Monaragala", "Uva", 700, 3, 5),
  z("Ratnapura", "Sabaragamuwa", 600, 2, 4),
  z("Kegalle", "Sabaragamuwa", 550, 2, 3),
];
