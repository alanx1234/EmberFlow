import { formatAgeGyr, sigFigs } from "./format-age";

/** Hover-label helpers for the Plotly charts.
 *
 * Both charts use logarithmically positioned x-axes, but hover labels must
 * always report the *linear* quantity: ages in Myr/Gyr, periods in days.
 */

/** Tooltip text for a point on the age posterior curve. */
export function posteriorHoverLabel(
  ageGyr: number,
  densityPerDex: number,
): string {
  return `Age: ${formatAgeGyr(ageGyr).text}<br>Posterior density: ${sigFigs(densityPerDex, 3)} per dex`;
}

/** Tooltip text for a point on the rotation-period density curve. */
export function rotationHoverLabel(
  protDays: number,
  densityPerDex: number,
): string {
  return `Period: ${sigFigs(protDays, 3)} days<br>Density: ${sigFigs(densityPerDex, 3)} per dex`;
}

/** Index of the grid point closest to `x` (assumes a sorted grid). Used to
 * position the hover dot on the curve. */
export function nearestIndex(grid: number[], x: number): number {
  if (grid.length === 0) return -1;
  let lo = 0;
  let hi = grid.length - 1;
  if (x <= grid[0]) return 0;
  if (x >= grid[hi]) return hi;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (grid[mid] <= x) lo = mid;
    else hi = mid;
  }
  return x - grid[lo] <= grid[hi] - x ? lo : hi;
}
