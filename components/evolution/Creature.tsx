"use client";

// Renders a lineage form from its deterministic layer list. Each instance gets a
// unique id prefix (React useId) so gradient ids never collide when several
// creatures share a page. The optional dev overlay shows attachment points and
// the viewBox bounds.

import { useId } from "react";
import { VIEWBOX, ATTACHMENTS } from "@/lib/evolution/creatures/parts";
import { renderDescriptor, type FormId } from "@/lib/evolution/creatures/lineage";
import type { TraitId } from "@/lib/evolution/traits/traits";
import { UI } from "@/lib/evolution/palette";
import { PART_COMPONENTS } from "./parts/CreatureParts";

export interface CreatureProps {
  form: FormId;
  traits: TraitId[];
  showAttachments?: boolean;
  label?: string;
  className?: string;
}

export function Creature({ form, traits, showAttachments = false, label, className }: CreatureProps) {
  const rawId = useId();
  const idPrefix = rawId.replace(/[^a-zA-Z0-9_-]/g, "");
  const layers = renderDescriptor(form, traits);

  return (
    <svg
      className={className}
      viewBox={`0 0 ${VIEWBOX.w} ${VIEWBOX.h}`}
      role="img"
      aria-label={label ?? `${form} lineage form`}
    >
      {layers.map(({ partId }) => {
        const Part = PART_COMPONENTS[partId];
        return <Part key={partId} idPrefix={`${idPrefix}-${partId}`} />;
      })}

      {showAttachments ? (
        <g pointerEvents="none">
          <rect
            x={1}
            y={1}
            width={VIEWBOX.w - 2}
            height={VIEWBOX.h - 2}
            fill="none"
            stroke={UI.accent}
            strokeDasharray="4 4"
            strokeOpacity={0.5}
          />
          {Object.values(ATTACHMENTS).map((a) => (
            <g key={a.id}>
              <circle cx={a.x} cy={a.y} r={3.5} fill="none" stroke={UI.accent} strokeWidth={1.5} />
              <circle cx={a.x} cy={a.y} r={1} fill={UI.accent} />
              <text
                x={a.x + 5}
                y={a.y - 5}
                fontSize={8}
                fill={UI.accent}
                style={{ fontFamily: "var(--font-mono), monospace" }}
              >
                {a.id}
              </text>
            </g>
          ))}
        </g>
      ) : null}
    </svg>
  );
}
