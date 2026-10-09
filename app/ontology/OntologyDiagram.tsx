"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { diagnoses, drugClasses, drugs, labs } from "@/lib/oncology-ontology";

type Point = { x: number; y: number };
type Line = { key: string; from: Point; to: Point };

function NodeCard({
  nodeRef,
  title,
  detail,
}: {
  nodeRef: (element: HTMLDivElement | null) => void;
  title: string;
  detail?: string;
}) {
  return (
    <div ref={nodeRef} className="relative z-10 rounded-lg border border-border bg-card px-3 py-2 shadow-sm">
      <p className="text-sm font-semibold">{title}</p>
      {detail && <p className="font-mono text-xs text-muted-foreground">{detail}</p>}
    </div>
  );
}

function ColumnTitle({ children }: { children: string }) {
  return (
    <p className="relative z-10 mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </p>
  );
}

export function OntologyDiagram() {
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef(new Map<string, HTMLElement>());
  const [lines, setLines] = useState<Line[]>([]);

  function registerNode(id: string) {
    return (element: HTMLDivElement | null) => {
      if (element) nodeRefs.current.set(id, element);
      else nodeRefs.current.delete(id);
    };
  }

  useLayoutEffect(() => {
    function measure() {
      const container = containerRef.current;
      if (!container) return;
      const base = container.getBoundingClientRect();

      function point(id: string, side: "left" | "right"): Point | null {
        const element = nodeRefs.current.get(id);
        if (!element) return null;
        const rect = element.getBoundingClientRect();
        return {
          x: (side === "left" ? rect.left : rect.right) - base.left,
          y: rect.top + rect.height / 2 - base.top,
        };
      }

      const next: Line[] = [];
      for (const diagnosis of diagnoses) {
        for (const labId of diagnosis.labIds) {
          const from = point(`lab-${labId}`, "right");
          const to = point(`dx-${diagnosis.id}`, "left");
          if (from && to) next.push({ key: `lab-${labId}-dx-${diagnosis.id}`, from, to });
        }
      }
      for (const drug of drugs) {
        for (const diagnosisId of drug.diagnosisIds) {
          const from = point(`dx-${diagnosisId}`, "right");
          const to = point(`drug-${drug.id}`, "left");
          if (from && to) next.push({ key: `dx-${diagnosisId}-drug-${drug.id}`, from, to });
        }
      }
      setLines(next);
    }

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  return (
    <div>
      <div ref={containerRef} className="relative grid grid-cols-3 gap-8">
        <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
          {lines.map((line) => {
            const bend = (line.to.x - line.from.x) / 2;
            return (
              <path
                key={line.key}
                d={`M ${line.from.x} ${line.from.y} C ${line.from.x + bend} ${line.from.y}, ${line.to.x - bend} ${line.to.y}, ${line.to.x} ${line.to.y}`}
                fill="none"
                style={{ stroke: "hsl(var(--primary))", strokeOpacity: 0.4, strokeWidth: 2 }}
              />
            );
          })}
        </svg>

        <div>
          <ColumnTitle>Lab (LOINC)</ColumnTitle>
          <div className="flex flex-col gap-4">
            {labs.map((lab) => (
              <NodeCard key={lab.id} nodeRef={registerNode(`lab-${lab.id}`)} title={lab.name} detail={lab.loinc} />
            ))}
          </div>
        </div>

        <div>
          <ColumnTitle>Diagnosis (ICD-10-CM)</ColumnTitle>
          <div className="flex flex-col gap-4">
            {diagnoses.map((diagnosis) => (
              <NodeCard
                key={diagnosis.id}
                nodeRef={registerNode(`dx-${diagnosis.id}`)}
                title={diagnosis.name}
                detail={diagnosis.icd10cm}
              />
            ))}
          </div>
        </div>

        <div>
          <ColumnTitle>Drug (RxNorm)</ColumnTitle>
          <div className="flex flex-col gap-5">
            {drugClasses.map((drugClass) => {
              const classDrugs = drugs.filter((drug) => drug.classId === drugClass.id);
              if (classDrugs.length === 0) return null;
              return (
                <div key={drugClass.id} className="flex flex-col gap-2">
                  <p className="relative z-10 text-xs font-medium text-muted-foreground">{drugClass.name}</p>
                  {classDrugs.map((drug) => (
                    <NodeCard
                      key={drug.id}
                      nodeRef={registerNode(`drug-${drug.id}`)}
                      title={drug.generic}
                      detail={drug.brand}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
