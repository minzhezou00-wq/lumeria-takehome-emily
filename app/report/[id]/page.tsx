"use client";

import { use, useEffect, useState } from "react";
import type { SkinReport } from "@/lib/types";

// The simplest possible version of the report: it proves the data flows end
// to end and nothing more. Replace all of it. See README.md for the brief.

export default function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [report, setReport] = useState<SkinReport | null>(null);

  useEffect(() => {
    fetch(`/api/reports/${id}`)
      .then((res) => res.json())
      .then(setReport);
  }, [id]);

  if (!report) return <p>Loading…</p>;

  const latest = report.scans[report.scans.length - 1];

  return (
    <main>
      <h1>{report.person.firstName}&apos;s skin report</h1>

      <h2>Latest scan</h2>
      <p>
        {latest.takenAt} · {latest.area}
      </p>
      <p>Overall: {latest.scores.overall}</p>
      <p>{latest.summary.headline}</p>
      <p>Tip: {latest.summary.tip}</p>

      <h2>All scans</h2>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Area</th>
            <th>Overall</th>
            <th>Hydration</th>
            <th>Evenness</th>
            <th>Redness</th>
            <th>Pigmentation</th>
            <th>Oiliness</th>
          </tr>
        </thead>
        <tbody>
          {report.scans.map((s) => (
            <tr key={s.id}>
              <td>{s.takenAt}</td>
              <td>{s.area}</td>
              <td>{s.scores.overall}</td>
              <td>{s.scores.hydration}</td>
              <td>{s.scores.evenness}</td>
              <td>{s.scores.redness}</td>
              <td>{s.scores.pigmentation}</td>
              <td>{s.scores.oiliness}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
