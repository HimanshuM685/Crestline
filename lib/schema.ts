export type Endpoint = "search" | "fetch" | "agent";
export type Step = "resolve" | "search" | "fetch" | "agent" | "compose";

export interface Evidence {
  url: string;
  detail: string;
  method: "html" | "stylesheet" | "markdown" | "agent";
}

export interface BrandGuide {
  reportId: string;
  generatedAt: string;
  recorded: boolean;
  brand: { name: string; domain: string; url: string; tagline: string | null };
  logo: { url: string; role: "primary" | "favicon" | "social"; source: Evidence }[];
  palette: { hex: string; role: string; source: Evidence }[];
  typography: {
    family: string;
    role: string;
    kind: "font-file" | "font-face" | "css-variable" | "css-rule" | "rendered-observation";
    source: Evidence;
  }[];
  voice: {
    attributes: { name: string; evidence: string }[];
    do: string[];
    dont: string[];
    quotes: { text: string; source: Evidence }[];
  };
  messaging: {
    headline: string | null;
    headlineSource: Evidence | null;
    description: string | null;
    descriptionSource: Evidence | null;
    pillars: { text: string; source: Evidence }[];
    callsToAction: { text: string; source: Evidence }[];
  };
  sources: { url: string; title: string; kind: "homepage" | "brand" | "stylesheet" }[];
  tinyfish: {
    endpoints: Endpoint[];
    calls: {
      endpoint: Endpoint;
      url: string;
      format: string;
      purpose: string;
      status: "completed" | "failed";
      error?: string;
    }[];
  };
}

export type StreamEvent =
  | { type: "progress"; step: Step; detail: string }
  | { type: "guide"; guide: BrandGuide }
  | { type: "error"; error: string };

export interface FetchPage {
  url: string;
  final_url?: string;
  title?: string;
  description?: string;
  text: string;
  links?: (string | { url?: string; href?: string; text?: string })[];
  image_links?: (string | { url?: string; src?: string })[];
}

export interface AgentObservation {
  logoUrl?: string;
  colors?: { hex: string; role: string; location: string }[];
  fonts?: { family: string; role: string }[];
  headline?: string;
  cta?: string;
  quotes?: string[];
  stylesheetUrls?: string[];
}
