export type RenderSuccessResult = {
  ok: true;
  status: "COMPLETED";
  typstPath: string;
  pdfPath: string;
  logs: string[];
};

export type RenderFailureResult = {
  ok: false;
  status: "FAILED";
  error: {
    message: string;
    details?: string;
  };
  logs: string[];
};

export type RenderResult = RenderSuccessResult | RenderFailureResult;
