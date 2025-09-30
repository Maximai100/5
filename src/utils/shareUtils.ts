import { supabase } from '../supabaseClient';
import { Project, FinanceEntry, WorkStage, PhotoReport } from '../types';

export interface ClientReportPayload {
  version: number;
  generatedAt: string;
  project: {
    id: string;
    name: string;
    client?: string;
    address?: string;
    status?: string;
  };
  financials: {
    estimatesTotal: number;
    paidTotal: number;
    remainingToPay: number;
  };
  workStages: Array<{
    title: string;
    endDate?: string;
    status: string;
    progress: number;
  }>;
  photoReports: Array<{
    id: string;
    title: string;
    date: string;
    photos: Array<{ url: string; caption?: string }>;
  }>;
  expiresAt?: string | null;
}

// Simple base64 helpers that support unicode
const b64encode = (str: string) => {
  try {
    return btoa(unescape(encodeURIComponent(str)));
  } catch {
    return btoa(str);
  }
};
const b64decode = (b64: string) => {
  try {
    return decodeURIComponent(escape(atob(b64)));
  } catch {
    return atob(b64);
  }
};

export const buildClientReportPayload = (args: {
  project: Project;
  estimatesTotal: number;
  paidTotal: number;
  remainingToPay: number;
  workStages: WorkStage[];
  photoReports: PhotoReport[];
  expiresAt?: string | null;
}): ClientReportPayload => {
  const { project, estimatesTotal, paidTotal, remainingToPay, workStages, photoReports, expiresAt } = args;
  const completedStages = (workStages || [])
    .filter((s) => s.status === 'completed')
    .sort((a, b) => new Date(b.endDate || 0).getTime() - new Date(a.endDate || 0).getTime())
    .map((s) => ({ title: s.title, endDate: s.endDate, status: s.status, progress: s.progress }));

  const photos = (photoReports || []).map((r) => ({
    id: r.id,
    title: r.title,
    date: r.date,
    photos: (r.photos || []).map((p) => ({ url: p.url, caption: p.caption })),
  }));

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    project: {
      id: project.id,
      name: project.name,
      client: (project as any).client,
      address: (project as any).address,
      status: (project as any).status,
    },
    financials: {
      estimatesTotal,
      paidTotal,
      remainingToPay,
    },
    workStages: completedStages,
    photoReports: photos,
    expiresAt: expiresAt ?? null,
  };
};

export const encodePayloadToParam = (payload: ClientReportPayload): string => {
  const json = JSON.stringify(payload);
  const b64 = b64encode(json);
  return `e.${b64}`; // encoded in URL
};

export const decodePayloadFromParam = (param: string): ClientReportPayload | null => {
  try {
    const raw = param.startsWith('e.') ? param.slice(2) : param;
    const json = b64decode(raw);
    const data = JSON.parse(json);
    return data;
  } catch (e) {
    console.error('decodePayloadFromParam failed:', e);
    return null;
  }
};

// Try to persist share to Supabase table if available.
// Table: client_report_shares (id uuid pk, user_id uuid, project_id uuid, token text unique, payload jsonb, expires_at timestamptz null, created_at timestamptz, updated_at timestamptz)
export const tryCreateServerShare = async (args: {
  projectId: string;
  payload: ClientReportPayload;
  expiresAt?: string | null;
}): Promise<{ ok: boolean; token?: string; error?: any }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: 'unauthenticated' };

    // Generate random token
    const token = `${Date.now().toString(36)}.${Math.random().toString(36).slice(2, 10)}`;
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('client_report_shares')
      .insert({
        user_id: user.id,
        project_id: args.projectId,
        token,
        payload: args.payload,
        expires_at: args.expiresAt || null,
        created_at: now,
        updated_at: now,
      })
      .select('token')
      .single();

    if (error) {
      console.warn('tryCreateServerShare insert error:', error);
      return { ok: false, error };
    }
    return { ok: true, token: data?.token || token };
  } catch (e) {
    console.warn('tryCreateServerShare failed:', e);
    return { ok: false, error: e };
  }
};

export const tryFetchServerShare = async (token: string): Promise<ClientReportPayload | null> => {
  try {
    const { data, error } = await supabase
      .from('client_report_shares')
      .select('payload, expires_at')
      .eq('token', token)
      .maybeSingle();

    if (error) {
      console.warn('tryFetchServerShare error:', error);
      return null;
    }
    if (!data) return null;
    const payload = data.payload as ClientReportPayload;
    if (data.expires_at) {
      const exp = new Date(data.expires_at).getTime();
      if (Date.now() > exp) return null;
    }
    return payload;
  } catch (e) {
    console.warn('tryFetchServerShare failed:', e);
    return null;
  }
};

export const buildShareUrl = (param: string): string => {
  const url = new URL(window.location.href);
  url.searchParams.set('share', param);
  return url.toString();
};

