// 2026 BAH for the San Antonio MHA (TX285) — all four JBSA installations
// share this MHA. Verified against the official DTMO BAH calculator
// (ZIP 78150). DoD publishes a single rate for O-7 and above.
// Rates change every January 1 — update this file (used by
// /military-relocation/ and /military-relocation/bah-rates/) each year.

export const BAH_YEAR = 2026;
export const BAH_MHA = 'TX285';
export const BAH_MHA_NAME = 'San Antonio, TX';
export const BAH_EFFECTIVE = 'January 1, 2026';

export interface BahRow {
  grade: string;
  withDeps: number;
  withoutDeps: number;
}

export interface BahGroup {
  label: string;
  rows: BahRow[];
}

export const bahGroups: BahGroup[] = [
  {
    label: 'Enlisted',
    rows: [
      { grade: 'E-1', withDeps: 1728, withoutDeps: 1359 },
      { grade: 'E-2', withDeps: 1728, withoutDeps: 1359 },
      { grade: 'E-3', withDeps: 1728, withoutDeps: 1359 },
      { grade: 'E-4', withDeps: 1728, withoutDeps: 1359 },
      { grade: 'E-5', withDeps: 1869, withoutDeps: 1500 },
      { grade: 'E-6', withDeps: 2094, withoutDeps: 1596 },
      { grade: 'E-7', withDeps: 2112, withoutDeps: 1731 },
      { grade: 'E-8', withDeps: 2121, withoutDeps: 1920 },
      { grade: 'E-9', withDeps: 2157, withoutDeps: 1977 },
    ],
  },
  {
    label: 'Warrant Officers',
    rows: [
      { grade: 'W-1', withDeps: 2109, withoutDeps: 1692 },
      { grade: 'W-2', withDeps: 2118, withoutDeps: 1917 },
      { grade: 'W-3', withDeps: 2130, withoutDeps: 1986 },
      { grade: 'W-4', withDeps: 2178, withoutDeps: 2085 },
      { grade: 'W-5', withDeps: 2280, withoutDeps: 2097 },
    ],
  },
  {
    label: 'Officers — Prior Enlisted',
    rows: [
      { grade: 'O-1E', withDeps: 2115, withoutDeps: 1866 },
      { grade: 'O-2E', withDeps: 2124, withoutDeps: 1965 },
      { grade: 'O-3E', withDeps: 2196, withoutDeps: 2082 },
    ],
  },
  {
    label: 'Officers',
    rows: [
      { grade: 'O-1', withDeps: 1905, withoutDeps: 1584 },
      { grade: 'O-2', withDeps: 2091, withoutDeps: 1827 },
      { grade: 'O-3', withDeps: 2127, withoutDeps: 2007 },
      { grade: 'O-4', withDeps: 2307, withoutDeps: 2088 },
      { grade: 'O-5', withDeps: 2457, withoutDeps: 2100 },
      { grade: 'O-6', withDeps: 2475, withoutDeps: 2103 },
      { grade: 'O-7 & above', withDeps: 2490, withoutDeps: 2112 },
    ],
  },
];

export const formatUsd = (n: number) => `$${n.toLocaleString('en-US')}`;
