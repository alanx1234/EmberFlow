"use client";

import { useRef, useState } from "react";
import { postRotation } from "@/lib/api";
import { RotationResponse } from "@/lib/schemas";
import { formatAgeGyr, sigFigs } from "@/lib/format-age";

interface AgeSliderProps {
  massMsun: number;
  massMsunErr: number;
  initialAgeGyr: number;
  minGyr: number;
  maxGyr: number;
  onResult: (res: RotationResponse) => void;
}

/** Log-scaled age slider that live-updates the forward-model density at a
 * fixed mass. Calls are debounced and stamped so out-of-order responses from
 * a fast drag are discarded. */
export function AgeSlider({
  massMsun,
  massMsunErr,
  initialAgeGyr,
  minGyr,
  maxGyr,
  onResult,
}: AgeSliderProps) {
  const [ageGyr, setAgeGyr] = useState(initialAgeGyr);
  // in-flight coalescing: at most one request at a time; while it runs we keep
  // only the latest age and fire it on completion, so updates stay continuous
  // and self-pace to whatever speed the server can actually manage.
  const inFlight = useRef(false);
  const pending = useRef<number | null>(null);
  const seq = useRef(0);

  const logMin = Math.log10(minGyr);
  const logMax = Math.log10(maxGyr);
  const t = (Math.log10(ageGyr) - logMin) / (logMax - logMin);

  const fire = async (newAge: number) => {
    inFlight.current = true;
    const id = ++seq.current;
    try {
      const res = await postRotation({
        age_gyr: newAge,
        mass_msun: massMsun,
        mass_msun_err: massMsunErr,
        n_samples: 0,
      });
      if (id === seq.current) onResult(res);
    } catch {
      /* transient failure during a drag — keep the last good density */
    } finally {
      inFlight.current = false;
      if (pending.current !== null) {
        const next = pending.current;
        pending.current = null;
        void fire(next);
      }
    }
  };

  const onSlide = (value: number) => {
    const newAge = 10 ** (logMin + value * (logMax - logMin));
    setAgeGyr(newAge);
    if (inFlight.current) {
      pending.current = newAge;
    } else {
      void fire(newAge);
    }
  };

  return (
    <section className="card" style={{ marginTop: "1.25rem" }}>
      <div className="card-title">Explore</div>
      <p className="note" style={{ marginTop: 0, marginBottom: "0.6rem" }}>
        Drag the age slider to see how the learned rotation-period distribution
        changes with age, at a fixed {sigFigs(massMsun)} M☉.
      </p>
      <div className="age-slider-row">
        <input
          className="age-slider"
          type="range"
          min={0}
          max={1}
          step={0.002}
          value={Math.min(1, Math.max(0, t))}
          onChange={(e) => onSlide(Number(e.target.value))}
          aria-label="Age"
        />
        <div className="age-slider-value">{formatAgeGyr(ageGyr).text}</div>
      </div>
      <div className="age-slider-scale">
        <span>{formatAgeGyr(minGyr).text}</span>
        <span>{formatAgeGyr(maxGyr).text}</span>
      </div>
    </section>
  );
}
