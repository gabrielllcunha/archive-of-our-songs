export type LegalSection = {
  title: string;
  paragraphs: string[];
  list?: string[];
};

export type LegalDocument = {
  title: string;
  effectiveDate: string;
  sections: LegalSection[];
};
