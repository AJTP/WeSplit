import { AppException } from "../../shared/exceptions/app-exception.js";

export class PersonalExpenseNotFoundError extends AppException {
  constructor(expenseId: string) {
    super(`Expense not found with id '${expenseId}'`, 404);
  }
}
