import Link from "next/link";
import { REPORT_IDS } from "@/lib/reports";

export default function Home() {
  return (
    <main>
      <h1>Skin reports</h1>
      <ul>
        {REPORT_IDS.map((id) => (
          <li key={id}>
            <Link href={`/report/${id}`}>{id}</Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
