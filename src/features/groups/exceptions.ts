import { AppException } from "../../shared/exceptions/app-exception.js";

export class GroupNotFoundError extends AppException {
  constructor(groupId: string) {
    super(`Group not found with id '${groupId}'`, 404);
  }
}

export class NotGroupMemberError extends AppException {
  constructor(groupId: string) {
    super(`You are not a member of group '${groupId}'`, 403);
  }
}

export class NotGroupAdminError extends AppException {
  constructor(groupId: string) {
    super(`You must be an admin of group '${groupId}' to do this`, 403);
  }
}

export class MemberNotFoundError extends AppException {
  constructor(groupId: string, memberId: string) {
    super(`Member '${memberId}' not found in group '${groupId}'`, 404);
  }
}

export class DuplicateAliasError extends AppException {
  constructor(groupId: string) {
    super(`An alias with that name already exists in group '${groupId}'`, 409);
  }
}

export class AliasAlreadyClaimedError extends AppException {
  constructor(memberId: string) {
    super(`Member '${memberId}' has already been claimed by another user`, 409);
  }
}

export class AlreadyGroupMemberError extends AppException {
  constructor(groupId: string) {
    super(`You already have an alias in group '${groupId}'`, 409, {
      hint: "Use PATCH /groups/:groupId/members/:memberId/claim to switch alias instead",
    });
  }
}

export class MemberHasActivityError extends AppException {
  constructor(groupId: string, memberId: string) {
    super(
      `Member '${memberId}' of group '${groupId}' has expenses or payments and cannot be removed`,
      409,
    );
  }
}

export class LastAdminError extends AppException {
  constructor(groupId: string) {
    super(`Group '${groupId}' must keep at least one admin`, 409);
  }
}

export class CannotRenameClaimedAliasError extends AppException {
  constructor(groupId: string, memberId: string) {
    super(
      `Only the owner of member '${memberId}' or an admin of group '${groupId}' can rename it`,
      403,
    );
  }
}

export class InvitationNotFoundError extends AppException {
  constructor(token: string) {
    super(`No group found for invitation token '${token}'`, 404);
  }
}
