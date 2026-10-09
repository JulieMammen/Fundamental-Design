import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { diagnoses, drugs, labs, patients } from "@/lib/oncology-ontology";
import { OntologyDiagram } from "./OntologyDiagram";

export default function OntologyPage() {
  return (
    <main className="min-h-screen p-8 text-foreground">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="text-4xl font-bold">Oncology ontology prototype</h1>
          <p className="mt-2 text-muted-foreground">
            Read left to right: each synthetic patient has a diagnosis, which links to the labs that
            monitor it and the drugs that treat it. The links are hand-curated for this demonstration
            and are not clinical guidance.
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <OntologyDiagram />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Synthetic patient cohort</CardTitle>
            <CardDescription>
              Five made-up patients for demonstration only. They are not real people and contain no
              real patient data.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-3 font-semibold">Patient</th>
                    <th className="py-2 pr-3 font-semibold">Diagnosis (ICD-10-CM)</th>
                    <th className="py-2 pr-3 font-semibold">Lab results (LOINC)</th>
                    <th className="py-2 font-semibold">Drug</th>
                  </tr>
                </thead>
                <tbody>
                  {patients.map((patient) => {
                    const diagnosis = diagnoses.find((item) => item.id === patient.diagnosisId);
                    return (
                      <tr key={patient.id} className="border-t border-border align-top">
                        <td className="py-3 pr-3">
                          <p className="font-mono font-semibold">{patient.id}</p>
                          <p className="text-xs text-muted-foreground">
                            {patient.age}, {patient.sex === "F" ? "female" : "male"}
                          </p>
                        </td>
                        <td className="py-3 pr-3">
                          <p>{diagnosis?.name}</p>
                          <p className="font-mono text-xs text-muted-foreground">{diagnosis?.icd10cm}</p>
                        </td>
                        <td className="py-3 pr-3">
                          <ul className="space-y-1">
                            {patient.labResults.map((result) => {
                              const lab = labs.find((item) => item.id === result.labId);
                              return (
                                <li key={result.labId}>
                                  {lab?.name}: <span className="font-semibold">{result.value}</span>{" "}
                                  <span className="text-xs text-muted-foreground">
                                    {lab?.unit} · {lab?.loinc}
                                  </span>
                                </li>
                              );
                            })}
                          </ul>
                        </td>
                        <td className="py-3">
                          <ul className="space-y-1">
                            {patient.drugIds.map((drugId) => {
                              const drug = drugs.find((item) => item.id === drugId);
                              return (
                                <li key={drugId}>
                                  {drug?.generic} {drug?.dose}{" "}
                                  <span className="text-xs text-muted-foreground">({drug?.brand})</span>
                                </li>
                              );
                            })}
                          </ul>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
