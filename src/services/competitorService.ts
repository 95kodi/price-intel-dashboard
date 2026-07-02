export interface ApiCompetitor {
  PlatformID: number;
  PlatformCode: string;
  PlatformName: string;
  BaseURL: string;
  CollectorType: string;
  IsEnabled: boolean;
}

export async function getCompetitors(): Promise<ApiCompetitor[]> {
  const response = await fetch("https://api.gogizmo.co/platforms/");
  if (!response.ok) throw new Error("Failed to fetch competitors");
  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

export async function getCompetitor(id: number): Promise<ApiCompetitor> {
  const response = await fetch(`https://api.gogizmo.co/platforms/${id}`);
  if (!response.ok) throw new Error("Failed to fetch competitor");
  return response.json();
}

export async function saveCompetitor(data: ApiCompetitor): Promise<ApiCompetitor> {
  const response = await fetch("https://api.gogizmo.co/platforms/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errBody = await response.json().catch(() => null);
    throw new Error(errBody?.message || "Failed to save competitor");
  }
  return response.json();
}
