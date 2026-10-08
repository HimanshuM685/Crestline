import type { BrandGuide } from "./schema";

export interface StoredReport { guide: BrandGuide; pdf: Buffer }
const globalStore = globalThis as typeof globalThis & { __crestlineReports?: Map<string, StoredReport> };
const reports = globalStore.__crestlineReports ??= new Map<string, StoredReport>();

export function storeReport(guide: BrandGuide, pdf: Buffer) {
  reports.set(guide.reportId, { guide, pdf });
}

export function getReport(id: string) { return reports.get(id); }
