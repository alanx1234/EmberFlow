/** Human-readable formatting for ages and rotation periods.
 *
 * Rule used everywhere in the UI (result cards, tables, hover tooltips):
 * below 1 Gyr ages are shown in Myr, at or above 1 Gyr in Gyr. Log-age is
 * never shown as a primary value.
 */

/** Round to `n` significant figures and render without trailing zeros
 * or exponent notation for the magnitudes we deal with. */
export function sigFigs(x: number, n = 3): string {
  if (!isFinite(x)) return "—";
  if (x === 0) return "0";
  const v = Number(x.toPrecision(n));
  // avoid "1.13e+3"-style output for values in the thousands
  if (Math.abs(v) >= 1e6 || Math.abs(v) < 1e-4) return v.toExponential(2);
  return v.toString();
}

export interface FormattedAge {
  value: string;
  unit: "Myr" | "Gyr";
  text: string;
}

/** Format an age given in Gyr: "247 Myr" below 1 Gyr, "2.41 Gyr" at or above. */
export function formatAgeGyr(ageGyr: number, sig = 3): FormattedAge {
  if (ageGyr < 1) {
    const value = sigFigs(ageGyr * 1000, sig);
    return { value, unit: "Myr", text: `${value} Myr` };
  }
  const value = sigFigs(ageGyr, sig);
  return { value, unit: "Gyr", text: `${value} Gyr` };
}

export interface AgeWithErrors {
  value: string;
  errLo: string;
  errHi: string;
  unit: "Myr" | "Gyr";
  intervalText: string;
}

/** Format a median age with its lower/upper uncertainties, all in the unit
 * chosen by the median (so "1.77 Gyr −0.64 / +1.04 Gyr"). */
export function formatAgeWithErrors(
  medianGyr: number,
  errLoGyr: number,
  errHiGyr: number,
): AgeWithErrors {
  const useGyr = medianGyr >= 1;
  const scale = useGyr ? 1 : 1000;
  const unit = useGyr ? "Gyr" : "Myr";
  const lo = medianGyr - errLoGyr;
  const hi = medianGyr + errHiGyr;
  return {
    value: sigFigs(medianGyr * scale),
    errLo: sigFigs(errLoGyr * scale),
    errHi: sigFigs(errHiGyr * scale),
    unit,
    intervalText: `${formatAgeGyr(lo).text}–${formatAgeGyr(hi).text}`,
  };
}

/** Rotation periods are always shown in linear days. */
export function formatDays(days: number, sig = 3): string {
  return `${sigFigs(days, sig)} d`;
}
