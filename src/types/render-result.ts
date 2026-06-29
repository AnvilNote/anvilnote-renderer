/** Font bundle / policy snapshot recorded with each successful render so a
 *  stored PDF can be traced back to the font setup that produced it. */
export type RenderFontConfig = {
  fontPresetVersion: string;
  fontBundle: string;
  mathMode: "default" | "garamond";
  primaryLang: "zh" | "en" | "ja" | "ko" | "th";
  titleFace: "taiwan-pearl" | "source-han";
  bodyFace: "song" | "kai";
  dateFace: "playfair" | "tai-heritage";
};

export type RenderSuccessResult = {
  ok: true;
  status: "COMPLETED";
  typstPath: string;
  pdfPath: string;
  logs: string[];
  fontConfig: RenderFontConfig;
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
