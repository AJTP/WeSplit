import type { APIRequestContext } from "@playwright/test";
import { API_URL } from "./env";

// Cliente para preparar datos saltándose la UI. Renueva con su propio refresh token.
export class ApiClient {
  private accessToken: string | null = null;

  constructor(
    private readonly request: APIRequestContext,
    private readonly refreshToken: string,
  ) {}

  private async token(): Promise<string> {
    if (!this.accessToken) {
      const response = await this.request.post(`${API_URL}/auth/refresh`, {
        data: { refresh_token: this.refreshToken },
      });
      if (!response.ok()) throw new Error(`Refresh failed: ${response.status()}`);
      this.accessToken = ((await response.json()) as { accessToken: string }).accessToken;
    }
    return this.accessToken;
  }

  async call<T>(
    method: "GET" | "POST" | "PATCH" | "DELETE",
    path: string,
    data?: unknown,
  ): Promise<T> {
    const response = await this.request.fetch(`${API_URL}${path}`, {
      method,
      headers: { authorization: `Bearer ${await this.token()}` },
      data,
    });
    if (!response.ok()) {
      throw new Error(`${method} ${path} -> ${response.status()}: ${await response.text()}`);
    }
    return response.status() === 204 ? (undefined as T) : ((await response.json()) as T);
  }

  get<T>(path: string) {
    return this.call<T>("GET", path);
  }
  post<T>(path: string, data?: unknown) {
    return this.call<T>("POST", path, data);
  }
}

interface GroupCreated {
  group: { id: string; name: string };
}

interface Member {
  id: string;
  alias: string;
}

// Crea un grupo como el creador (admin) con alias extra sin reclamar.
export async function createGroup(api: ApiClient, name: string, aliases: string[] = []) {
  const group = await api.post<GroupCreated["group"]>("/groups", { name, aliases });
  const members = await api.get<{ data: Member[] }>(`/groups/${group.id}/members?limit=100`);
  return { id: group.id, name: group.name, members: members.data };
}

// Gasto de grupo con reparto igual entre los participantes (céntimos sobrantes al primero).
export async function createEqualExpense(
  api: ApiClient,
  groupId: string,
  options: { description: string; amount: number; payerId: string; participantIds: string[] },
) {
  const cents = Math.round(options.amount * 100);
  const base = Math.floor(cents / options.participantIds.length);
  const remainder = cents - base * options.participantIds.length;
  const shares = options.participantIds.map((memberId, index) => ({
    member_id: memberId,
    amount: (base + (index === 0 ? remainder : 0)) / 100,
  }));
  return api.post(`/groups/${groupId}/expenses`, {
    description: options.description,
    amount: options.amount,
    expense_date: new Date().toISOString().slice(0, 10),
    paid_by_member_id: options.payerId,
    shares,
  });
}
