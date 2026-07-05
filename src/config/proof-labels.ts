// The proof block's fixed header text, per the document's own language
// (template.options.primaryLang — see cross-ref-labels.ts's identical
// pattern for why this is resolved here in TS rather than in Typst, and why
// it keys off the document's language, not any UI locale). Kept in sync by
// hand with anvilnote-web's messages/*.json editor.proof.label.
export type ProofPrimaryLang = "zh" | "en" | "ja" | "ko" | "th";

const LABELS: Record<ProofPrimaryLang, string> = {
  zh: "證",
  en: "Proof.",
  ja: "証明",
  ko: "증명",
  th: "พิสูจน์",
};

const DEFAULT_PRIMARY_LANG: ProofPrimaryLang = "zh";

export function proofLabel(primaryLang: string | undefined): string {
  return primaryLang && primaryLang in LABELS
    ? LABELS[primaryLang as ProofPrimaryLang]
    : LABELS[DEFAULT_PRIMARY_LANG];
}
