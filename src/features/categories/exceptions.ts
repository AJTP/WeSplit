import { AppException } from "../../shared/exceptions/app-exception.js";

export class CategoryNotFoundError extends AppException {
  constructor(categoryId: string) {
    super(`Category not found with id '${categoryId}'`, 404);
  }
}

export class DuplicateCategoryNameError extends AppException {
  constructor() {
    super("You already have a category with that name", 409);
  }
}

// La usan los gastos de grupo: solo admiten categorías predefinidas, nunca
// personalizadas de quien registra el gasto (ver FEATURES.md, Registrar
// gasto de grupo).
export class CategoryNotPredefinedError extends AppException {
  constructor(categoryId: string) {
    super(`Category '${categoryId}' is not a predefined category`, 422);
  }
}
