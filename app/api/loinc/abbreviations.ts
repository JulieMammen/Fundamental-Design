export const medicalAbbreviations: Record<string, string[]> = {
  ER: ["Estrogen Receptor", "ER Status"],
  PR: ["Progesterone Receptor", "PR Status"],
  HER2: ["HER2", "HER2 Status", "Human Epidermal Growth Factor Receptor 2"],
  CA125: ["CA-125", "Cancer Antigen 125"],
  "CA-125": ["CA-125", "Cancer Antigen 125"],
  CA153: ["CA 15-3", "Cancer Antigen 15-3"],
  "CA 15-3": ["CA 15-3", "Cancer Antigen 15-3"],
  AFP: ["Alpha-fetoprotein", "AFP"],
  PSA: ["Prostate Specific Antigen", "PSA"],
  WBC: ["White Blood Cell", "White blood cell count"],
  RBC: ["Red Blood Cell", "Red blood cell count"],
  Hgb: ["Hemoglobin", "Hb"],
  Hct: ["Hematocrit"],
  Plt: ["Platelets", "Platelet count"],
  MCV: ["Mean Corpuscular Volume"],
  MCH: ["Mean Corpuscular Hemoglobin"],
  MCHC: ["Mean Corpuscular Hemoglobin Concentration"],
  Creat: ["Creatinine"],
  BUN: ["Blood Urea Nitrogen"],
  Gluc: ["Glucose"],
  Na: ["Sodium"],
  K: ["Potassium"],
  Cl: ["Chloride"],
  CO2: ["Carbon Dioxide", "Bicarbonate"],
  Ca: ["Calcium"],
  Phos: ["Phosphate", "Phosphorus"],
  Mg: ["Magnesium"],
  ALT: ["Alanine Aminotransferase"],
  AST: ["Aspartate Aminotransferase"],
  ALP: ["Alkaline Phosphatase"],
  Bili: ["Bilirubin"],
  Alb: ["Albumin"],
  TSH: ["Thyroid Stimulating Hormone"],
  T3: ["Triiodothyronine"],
  T4: ["Thyroxine"],
  CK: ["Creatine Kinase"],
  LDH: ["Lactate Dehydrogenase"],
  TG: ["Triglycerides"],
  Chol: ["Cholesterol"],
  HDL: ["High Density Lipoprotein"],
  LDL: ["Low Density Lipoprotein"],
  PT: ["Prothrombin Time"],
  INR: ["International Normalized Ratio"],
  aPTT: ["Activated Partial Thromboplastin Time"],
  CMP: ["Comprehensive Metabolic Panel"],
  CBC: ["Complete Blood Count"],
  UA: ["Urinalysis"],
  "CD5": ["CD5", "Cluster of Differentiation 5"],
  "CD19": ["CD19", "Cluster of Differentiation 19"],
  "M-Protein": ["M-Protein", "Monoclonal Protein"],
  "B2M": ["Beta-2 Microglobulin"],
};

export function expandQuery(query: string): string[] {
  const normalized = query.trim();
  const results = new Set<string>([normalized]);

  // Direct match (e.g., "ER" or "CA-125")
  const directExpansions = medicalAbbreviations[normalized];
  if (directExpansions) {
    directExpansions.forEach((exp) => results.add(exp));
    return Array.from(results);
  }

  // Try extracting first word as abbreviation (e.g., "ER Status" → check "ER")
  const parts = normalized.split(/\s+/);
  const firstWord = parts[0];
  if (firstWord && firstWord !== normalized) {
    const abbrevExpansions = medicalAbbreviations[firstWord];
    if (abbrevExpansions) {
      abbrevExpansions.forEach((exp) => {
        results.add(exp);
        // Also add the rest of the phrase to the expansion
        const rest = parts.slice(1).join(" ");
        if (rest) {
          results.add(`${exp} ${rest}`);
        }
      });
    }
  }

  return Array.from(results);
}
