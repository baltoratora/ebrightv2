import { Pool } from "@/components/Pool";
import { BackBar } from "@/components/BackBar";

export const metadata = { title: "Pool" };

export default function PoolPage() {
  return (
    <main className="page">
      <BackBar href="/thinking" label="← Thinking Mode" />
      <header className="brand">
        <div>
          <h1>Pool</h1>
          <span className="tag">sink them all</span>
        </div>
      </header>
      <Pool />
    </main>
  );
}
