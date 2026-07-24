"use client";

import { useRef, useState } from "react";
import Papa from "papaparse";

export interface ParsedCsv {
  fileName: string;
  headers: string[];
  rows: Record<string, unknown>[];
}

interface BatchUploaderProps {
  onParsed: (parsed: ParsedCsv) => void;
  onError: (message: string) => void;
}

/** CSV drop-zone / file picker. Files are parsed entirely in the browser and
 * never uploaded anywhere except as validated numbers at inference time. */
export function BatchUploader({ onParsed, onError }: BatchUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [parsing, setParsing] = useState(false);

  const handleFile = (file: File) => {
    setParsing(true);
    Papa.parse<Record<string, unknown>>(file, {
      header: true,
      skipEmptyLines: "greedy",
      complete: (res) => {
        setParsing(false);
        const headers = (res.meta.fields ?? []).filter((h) => h.trim() !== "");
        if (headers.length === 0 || res.data.length === 0) {
          onError(
            "That file has no parseable rows. Expecting a CSV with a header row.",
          );
          return;
        }
        onParsed({ fileName: file.name, headers, rows: res.data });
      },
      error: (err) => {
        setParsing(false);
        onError(`Could not parse the CSV: ${err.message}`);
      },
    });
  };

  return (
    <div>
      <div
        className={`dropzone${drag ? " drag" : ""}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          const file = e.dataTransfer.files?.[0];
          if (file) handleFile(file);
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        aria-label="Upload a CSV of stars"
      >
        {parsing ? (
          <div className="loading-block" style={{ padding: 0 }}>
            <span className="spinner" aria-hidden /> Parsing…
          </div>
        ) : (
          <>
            <div className="big">Drop a CSV here, or click to browse</div>
            <div>
              One row per star — rotation period (days) and mass (M☉) required.
            </div>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}
