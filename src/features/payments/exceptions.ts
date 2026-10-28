import { AppException } from "../../shared/exceptions/app-exception.js";

export class PaymentNotFoundError extends AppException {
  constructor(groupId: string, paymentId: string) {
    super(`Payment '${paymentId}' not found in group '${groupId}'`, 404);
  }
}

export class PaymentMemberNotInGroupError extends AppException {
  constructor(groupId: string, memberIds: string[]) {
    super(`Some members are not part of group '${groupId}'`, 422, { member_ids: memberIds });
  }
}
