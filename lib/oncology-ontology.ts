export type Lab = { id: string; name: string; loinc: string; unit: string };

export type Diagnosis = { id: string; name: string; icd10cm: string; labIds: string[] };

export type DrugClass = { id: string; name: string; description: string };

export type Drug = {
  id: string;
  generic: string;
  brand: string;
  dose: string;
  classId: string;
  diagnosisIds: string[];
};

export type Patient = {
  id: string;
  age: number;
  sex: "F" | "M";
  diagnosisId: string;
  labResults: { labId: string; value: string }[];
  drugIds: string[];
};

export const labs: Lab[] = [
  { id: "er", name: "ER status", loinc: "40556-3", unit: "" },
  { id: "pr", name: "PR status", loinc: "40557-1", unit: "" },
  { id: "psa", name: "PSA, serum", loinc: "2857-1", unit: "ng/mL" },
  { id: "wbc", name: "White blood cell count", loinc: "6690-2", unit: "10*9/L" },
  { id: "hgb", name: "Hemoglobin", loinc: "718-7", unit: "g/dL" },
];

export const diagnoses: Diagnosis[] = [
  { id: "breast", name: "Breast cancer, female", icd10cm: "C50.919", labIds: ["er", "pr"] },
  { id: "lung", name: "Lung cancer", icd10cm: "C34.90", labIds: [] },
  { id: "colon", name: "Colon cancer", icd10cm: "C18.9", labIds: [] },
  { id: "prostate", name: "Prostate cancer", icd10cm: "C61", labIds: ["psa"] },
  { id: "brain", name: "Malignant brain tumor", icd10cm: "C71.9", labIds: [] },
  { id: "cml", name: "Chronic myeloid leukemia", icd10cm: "C92.10", labIds: ["wbc"] },
];

export const drugClasses: DrugClass[] = [
  {
    id: "serm",
    name: "Selective estrogen receptor modulator",
    description: "Blocks estrogen receptors in breast tissue.",
  },
  {
    id: "aromatase",
    name: "Aromatase inhibitor",
    description: "Lowers estrogen production after menopause.",
  },
  {
    id: "cyp17",
    name: "CYP17 inhibitor",
    description: "Blocks androgen production.",
  },
  {
    id: "tki",
    name: "Tyrosine kinase inhibitor",
    description: "Blocks enzymes that drive tumor cell growth.",
  },
  {
    id: "antimetabolite",
    name: "Antimetabolite",
    description: "Interferes with DNA and RNA building blocks.",
  },
  {
    id: "alkylating",
    name: "Alkylating agent",
    description: "Damages DNA so cancer cells stop dividing.",
  },
];

export const drugs: Drug[] = [
  { id: "tamoxifen", generic: "tamoxifen", brand: "Nolvadex", dose: "20 mg", classId: "serm", diagnosisIds: ["breast"] },
  { id: "anastrozole", generic: "anastrozole", brand: "Arimidex", dose: "1 mg", classId: "aromatase", diagnosisIds: ["breast"] },
  { id: "letrozole", generic: "letrozole", brand: "Femara", dose: "2.5 mg", classId: "aromatase", diagnosisIds: ["breast"] },
  { id: "abiraterone", generic: "abiraterone", brand: "Zytiga", dose: "250 mg", classId: "cyp17", diagnosisIds: ["prostate"] },
  { id: "imatinib", generic: "imatinib", brand: "Gleevec", dose: "400 mg", classId: "tki", diagnosisIds: ["cml"] },
  { id: "lapatinib", generic: "lapatinib", brand: "Tykerb", dose: "250 mg", classId: "tki", diagnosisIds: ["breast"] },
  { id: "erlotinib", generic: "erlotinib", brand: "Tarceva", dose: "150 mg", classId: "tki", diagnosisIds: ["lung"] },
  { id: "capecitabine", generic: "capecitabine", brand: "Xeloda", dose: "500 mg", classId: "antimetabolite", diagnosisIds: ["breast", "colon"] },
  { id: "methotrexate", generic: "methotrexate", brand: "Trexall", dose: "2.5 mg", classId: "antimetabolite", diagnosisIds: [] },
  { id: "temozolomide", generic: "temozolomide", brand: "Temodar", dose: "100 mg", classId: "alkylating", diagnosisIds: ["brain"] },
];

export const patients: Patient[] = [
  {
    id: "SYN-001",
    age: 58,
    sex: "F",
    diagnosisId: "breast",
    labResults: [
      { labId: "er", value: "Positive" },
      { labId: "pr", value: "Positive" },
      { labId: "hgb", value: "12.9" },
    ],
    drugIds: ["anastrozole"],
  },
  {
    id: "SYN-002",
    age: 67,
    sex: "M",
    diagnosisId: "prostate",
    labResults: [
      { labId: "psa", value: "12.4" },
      { labId: "hgb", value: "13.6" },
    ],
    drugIds: ["abiraterone"],
  },
  {
    id: "SYN-003",
    age: 61,
    sex: "M",
    diagnosisId: "lung",
    labResults: [{ labId: "hgb", value: "11.2" }],
    drugIds: ["erlotinib"],
  },
  {
    id: "SYN-004",
    age: 72,
    sex: "F",
    diagnosisId: "colon",
    labResults: [{ labId: "hgb", value: "10.8" }],
    drugIds: ["capecitabine"],
  },
  {
    id: "SYN-005",
    age: 49,
    sex: "M",
    diagnosisId: "cml",
    labResults: [
      { labId: "wbc", value: "96.5" },
      { labId: "hgb", value: "10.1" },
    ],
    drugIds: ["imatinib"],
  },
];
