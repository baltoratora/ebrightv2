"use client";

// Renders a lineage form from its deterministic layer list, using the form's
// parametric body + derived attachment anchors. Each instance gets a unique id
// prefix (React useId) so gradient ids never collide across creatures.

import { useId } from "react";
import { VIEWBOX } from "@/lib/evolution/creatures/parts";
import { renderDescriptor, type FormId } from "@/lib/evolution/creatures/lineage";
import { BODIES, anchorsFor } from "@/lib/evolution/creatures/bodies";
import type { TraitId } from "@/lib/evolution/traits/traits";
import { UI } from "@/lib/evolution/palette";
import { PART_COMPONENTS } from "./parts/CreatureParts";

export interface CreatureProps {
  form: FormId;
  traits: TraitId[];
  showAttachments?: boolean;
  label?: string;
  className?: string;
  enhancedEyes?: boolean;
}

export function Creature({ form, traits, showAttachments = false, label, className, enhancedEyes = false }: CreatureProps) {
  const rawId = useId();
  const idPrefix = rawId.replace(/[^a-zA-Z0-9_-]/g, "");
  const body = BODIES[form];
  const anchors = anchorsFor(body);
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
        return <Part key={partId} idPrefix={`${idPrefix}-${partId}`} body={body} anchors={anchors} enhancedEyes={enhancedEyes} />;
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
          {Object.entries(anchors).map(([id, a]) => (
            <g key={id}>
              <circle cx={a.x} cy={a.y} r={3.5} fill="none" stroke={UI.accent} strokeWidth={1.5} />
              <circle cx={a.x} cy={a.y} r={1} fill={UI.accent} />
              <text
                x={a.x + 5}
                y={a.y - 5}
                fontSize={8}
                fill={UI.accent}
                style={{ fontFamily: "var(--font-mono), monospace" }}
              >
                {id}
              </text>
            </g>
          ))}
        </g>
      ) : null}
    </svg>
  );
}
