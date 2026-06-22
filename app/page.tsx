"use client";

import { useState } from "react";
import Link from "next/link";
import { DEFAULT_TOPIC } from "@/lib/topics";
import { BackBar } from "@/components/BackBar";
import { FunFact } from "@/components/FunFact";
import { TopicSelector } from "@/components/TopicSelector";
import { PaperOfDay } from "@/components/PaperOfDay";

export default function Home() {
  const [topicId, setTopicId] = useState(DEFAULT_TOPIC.id);

  return (
    <main className="page">
      <BackBar href="https://www.baltoratora.my" label="← baltoratora.my" external />

      <header className="brand">
        <div>
          <h1>baltoratora</h1>
          <span className="tag">daily STEM · fact · paper</span>
        </div>
        <Link href="/thinking" className="btn ghost thinking-link">
          🧠 Thinking Mode
        </Link>
      </header>

      <FunFact />
      <TopicSelector active={topicId} onChange={setTopicId} />
      <PaperOfDay topic={topicId} />
    </main>
  );
}
