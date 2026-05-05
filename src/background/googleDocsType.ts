type TextRun = {
  content: string;
};

type ParagraphElement = {
  startIndex: number;
  endIndex: number;

  textRun?: TextRun;
};

type Paragraph = {
  elements: ParagraphElement[];
};

type StructuralElement = {
  startIndex: number;
  endIndex: number;
  paragraph?: Paragraph;
};

export type GoogleDocType = {
  documentId: string;
  body: {
    content: StructuralElement[];
  };
};