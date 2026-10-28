import { AppException } from "../../shared/exceptions/app-exception.js";

export class UnverifiedEmailError extends AppException {
  constructor(provider: string) {
    super(`Email not verified by provider '${provider}'`, 401);
  }
}

export class LastIdentityError extends AppException {
  constructor() {
    super("Cannot unlink the only identity of the account", 409);
  }
}

export class IdentityAlreadyLinkedError extends AppException {
  constructor(provider: string) {
    super(`This '${provider}' account is already linked to another user`, 409);
  }
}

export class IdentityNotFoundError extends AppException {
  constructor(provider: string) {
    super(`No '${provider}' identity linked to this account`, 404);
  }
}
