import { AppException } from "../../shared/exceptions/app-exception.js";

export class GroupExpenseNotFoundError extends AppException {
  constructor(groupId: string, expenseId: string) {
    super(`Expense '${expenseId}' not found in group '${groupId}'`, 404);
  }
}

export class ExpenseSharesMismatchError extends AppException {
  constructor(expectedAmount: number, actualAmount: number) {
    super(
      `The sum of the shares (${actualAmount}) does not match the expense amount (${expectedAmount})`,
      422,
      {
        expected_amount: expectedAmount,
        actual_amount: actualAmount,
      },
    );
  }
}

export class MemberNotInGroupError extends AppException {
  constructor(groupId: string, memberIds: string[]) {
    super(`Some members are not part of group '${groupId}'`, 422, { member_ids: memberIds });
  }
}
