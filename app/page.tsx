"use client";

import { useState } from "react";
import { DEFAULT_TOPIC, topicById } from "@/lib/topics";
import { FunFact } from "@/components/FunFact";
import { TopicSelector } from "@/components/TopicSelector";
import { PaperOfDay } from "@/components/PaperOfDay";
import { WallpaperGenerator } from "@/components/WallpaperGenerator";

export default function Home() {
  const [topicId, setTopicId] = useState(DEFAULT_TOPIC.id);
  const topic = topicById(topicId);

  return (
    <main className="page">
      <header className="brand">
        <h1>baltoratora</h1>
        <span className="tag">daily STEM · fact · paper · wallpaper</span>
      </header>

      <FunFact />

      <TopicSelector active={topicId} onChange={setTopicId} />

      <PaperOfDay topic={topicId} />

      <WallpaperGenerator seed={topic.wallpaperSeed} />
    </main>
  );
}
