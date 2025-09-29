export type PhotoReportMeta = {
  tags?: string[];
  stage?: string;
};

const META_STORAGE_KEY = 'photoReportsMeta';

function readAll(): Record<string, PhotoReportMeta> {
  try {
    const raw = localStorage.getItem(META_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function writeAll(data: Record<string, PhotoReportMeta>): void {
  try {
    localStorage.setItem(META_STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

export const photoReportMetaService = {
  get(id: string): PhotoReportMeta | undefined {
    const all = readAll();
    return all[id];
  },
  set(id: string, meta: PhotoReportMeta): void {
    const all = readAll();
    all[id] = { ...all[id], ...meta };
    writeAll(all);
  },
  mergeMeta<T extends { id: string; tags?: string[]; stage?: string }>(
    reports: T[]
  ): T[] {
    const all = readAll();
    return reports.map(r => {
      const m = all[r.id];
      return m ? { ...r, ...m } : r;
    });
  },
  remove(id: string): void {
    const all = readAll();
    delete all[id];
    writeAll(all);
  },
  clear(): void {
    writeAll({});
  }
};

