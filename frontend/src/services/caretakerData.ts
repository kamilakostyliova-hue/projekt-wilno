export type CaretakerAdminUpdate = {
  id: string;
  caretakerEmail: string;
  caretakerName: string;
  note: string;
  createdAt: string;
  assignedCount: number;
  openTasksCount: number;
};

export type CaretakerChangeStatus = "pending" | "approved" | "rejected";

export type CaretakerChangeProposal = {
  id: string;
  placeId: number;
  placeName: string;
  caretakerEmail: string;
  caretakerName: string;
  description: string;
  category: string;
  graveStatus: string;
  note: string;
  status: CaretakerChangeStatus;
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
};

export type CaretakerAssignments = Record<string, number[]>;

type CaretakerUpdatePayload = Omit<CaretakerAdminUpdate, "id" | "createdAt">;

export type CareReportPayload = {
  placeId: number | null;
  placeName: string;
  type: string;
  note: string;
  reporterEmail?: string;
};

export type RemoteCareReport = CareReportPayload & {
  id: string;
  status: string;
  createdAt: string;
  updatedAt?: string | null;
};

const apiBaseUrl = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

const apiUrl = (path: string) => `${apiBaseUrl}${path}`;

const isLocalOrigin = () => {
  if (typeof window === "undefined") return false;
  return ["localhost", "127.0.0.1", "0.0.0.0"].includes(window.location.hostname);
};

const shouldUseBackend = () => Boolean(apiBaseUrl) || isLocalOrigin();

export const fetchCaretakerAssignments = async (): Promise<CaretakerAssignments | null> => {
  if (!shouldUseBackend()) return null;

  try {
    const response = await fetch(apiUrl("/api/caretakers/assignments"));
    if (!response.ok) return null;
    return (await response.json()) as CaretakerAssignments;
  } catch {
    return null;
  }
};

export const saveCaretakerAssignments = async (
  caretakerEmail: string,
  placeIds: number[],
  assignedByEmail?: string
): Promise<boolean> => {
  if (!shouldUseBackend()) return false;

  try {
    const response = await fetch(
      apiUrl(`/api/caretakers/assignments/${encodeURIComponent(caretakerEmail)}`),
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placeIds, assignedByEmail }),
      }
    );
    return response.ok;
  } catch {
    return false;
  }
};

export const fetchCaretakerUpdates = async (
  caretakerEmail?: string
): Promise<CaretakerAdminUpdate[] | null> => {
  if (!shouldUseBackend()) return null;

  const query = caretakerEmail
    ? `?caretaker_email=${encodeURIComponent(caretakerEmail)}`
    : "";

  try {
    const response = await fetch(apiUrl(`/api/caretakers/updates${query}`));
    if (!response.ok) return null;
    return (await response.json()) as CaretakerAdminUpdate[];
  } catch {
    return null;
  }
};

export const saveCaretakerUpdate = async (
  payload: CaretakerUpdatePayload
): Promise<CaretakerAdminUpdate | null> => {
  if (!shouldUseBackend()) return null;

  try {
    const response = await fetch(apiUrl("/api/caretakers/updates"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) return null;
    return (await response.json()) as CaretakerAdminUpdate;
  } catch {
    return null;
  }
};

export const fetchCareReports = async (): Promise<RemoteCareReport[] | null> => {
  if (!shouldUseBackend()) return null;

  try {
    const response = await fetch(apiUrl("/api/care-reports"));
    if (!response.ok) return null;
    return (await response.json()) as RemoteCareReport[];
  } catch {
    return null;
  }
};

export const saveCareReport = async (
  payload: CareReportPayload
): Promise<RemoteCareReport | null> => {
  if (!shouldUseBackend()) return null;

  try {
    const response = await fetch(apiUrl("/api/care-reports"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) return null;
    return (await response.json()) as RemoteCareReport;
  } catch {
    return null;
  }
};

export const updateCareReportStatus = async (
  reportId: string,
  status: string
): Promise<RemoteCareReport | null> => {
  if (!shouldUseBackend()) return null;

  try {
    const response = await fetch(apiUrl(`/api/care-reports/${encodeURIComponent(reportId)}`), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) return null;
    return (await response.json()) as RemoteCareReport;
  } catch {
    return null;
  }
};
