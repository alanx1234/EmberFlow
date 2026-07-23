import { describe, expect, it } from "vitest";
import {
  formatAgeGyr,
  formatAgeWithErrors,
  formatDays,
  sigFigs,
} from "@/lib/format-age";

describe("sigFigs", () => {
  it("keeps three significant figures without trailing zeros", () => {
    expect(sigFigs(247.31)).toBe("247");
    expect(sigFigs(2.412)).toBe("2.41");
    expect(sigFigs(0.51)).toBe("0.51");
    expect(sigFigs(20)).toBe("20");
    expect(sigFigs(1130)).toBe("1130");
  });

  it("handles degenerate values", () => {
    expect(sigFigs(0)).toBe("0");
    expect(sigFigs(NaN)).toBe("—");
  });
});

describe("formatAgeGyr", () => {
  it("uses Myr below 1 Gyr", () => {
    expect(formatAgeGyr(0.247).text).toBe("247 Myr");
    expect(formatAgeGyr(0.001).text).toBe("1 Myr");
    expect(formatAgeGyr(0.999).text).toBe("999 Myr");
  });

  it("uses Gyr at or above 1 Gyr", () => {
    expect(formatAgeGyr(1).text).toBe("1 Gyr");
    expect(formatAgeGyr(2.412).text).toBe("2.41 Gyr");
    expect(formatAgeGyr(13.8).text).toBe("13.8 Gyr");
  });
});

describe("formatAgeWithErrors", () => {
  it("matches the tutorial star: 1.77 −0.64/+1.04 Gyr", () => {
    const fmt = formatAgeWithErrors(1.77, 0.64, 1.04);
    expect(fmt.value).toBe("1.77");
    expect(fmt.errLo).toBe("0.64");
    expect(fmt.errHi).toBe("1.04");
    expect(fmt.unit).toBe("Gyr");
    expect(fmt.intervalText).toBe("1.13 Gyr–2.81 Gyr");
  });

  it("switches everything to Myr for young stars", () => {
    const fmt = formatAgeWithErrors(0.25, 0.1, 0.2);
    expect(fmt.value).toBe("250");
    expect(fmt.errLo).toBe("100");
    expect(fmt.errHi).toBe("200");
    expect(fmt.unit).toBe("Myr");
  });
});

describe("formatDays", () => {
  it("formats linear days", () => {
    expect(formatDays(12.34)).toBe("12.3 d");
    expect(formatDays(0.55)).toBe("0.55 d");
  });
});
