import { del, get, post } from "./client";
import type { Paginated, Payment } from "./types";

export const listPayments = (groupId: string, page: number, limit: number) =>
  get<Paginated<Payment>>(`/groups/${groupId}/payments`, { page, limit });

export interface PaymentBody {
  from_member_id: string;
  to_member_id: string;
  amount: number;
  paid_on: string;
  note?: string | null;
}

export const createPayment = (groupId: string, body: PaymentBody) =>
  post<Payment>(`/groups/${groupId}/payments`, body);

export const deletePayment = (groupId: string, paymentId: string) =>
  del(`/groups/${groupId}/payments/${paymentId}`);
