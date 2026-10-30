import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { addMembers, claimMember, removeMember, renameMember } from "../../api/members";
import type { GroupMember } from "../../api/types";
import { Button } from "../../components/Button";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { Field, TextArea, TextInput } from "../../components/Field";
import { Modal } from "../../components/Modal";
import { ErrorState, LoadingState } from "../../components/States";
import { errorMessage } from "../../lib/errors";
import { invalidateGroup } from "../../lib/queryKeys";
import { useGroup } from "./useGroup";
import { useGroupMembers } from "./useGroupMembers";

const addSchema = z.object({
  aliasesText: z.string().refine((text) => text.split("\n").some((line) => line.trim()), {
    message: "Escribe al menos un alias.",
  }),
});

const renameSchema = z.object({
  alias: z
    .string()
    .trim()
    .min(1, "El alias no puede estar vacío.")
    .max(120, "Máximo 120 caracteres."),
});

export function MembersPage() {
  const { groupId, userGroup, isAdmin } = useGroup();
  const { member: me } = userGroup;
  const queryClient = useQueryClient();
  const members = useGroupMembers(groupId);
  const [renaming, setRenaming] = useState<GroupMember | null>(null);
  const [removing, setRemoving] = useState<GroupMember | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const addForm = useForm({ resolver: zodResolver(addSchema), defaultValues: { aliasesText: "" } });
  const renameForm = useForm({ resolver: zodResolver(renameSchema), defaultValues: { alias: "" } });

  const addMutation = useMutation({
    mutationFn: (aliases: string[]) => addMembers(groupId, aliases),
    onSuccess: () => {
      addForm.reset();
      setActionError(null);
      return invalidateGroup(queryClient, groupId);
    },
    onError: (error) => setActionError(errorMessage(error)),
  });

  const renameMutation = useMutation({
    mutationFn: (values: { id: string; alias: string }) =>
      renameMember(groupId, values.id, values.alias),
    onSuccess: () => {
      setRenaming(null);
      setActionError(null);
      return invalidateGroup(queryClient, groupId);
    },
    onError: (error) => setActionError(errorMessage(error)),
  });

  const claimMutation = useMutation({
    mutationFn: (memberId: string) => claimMember(groupId, memberId),
    onSuccess: () => {
      setActionError(null);
      return invalidateGroup(queryClient, groupId);
    },
    onError: (error) => setActionError(errorMessage(error)),
  });

  const removeMutation = useMutation({
    mutationFn: (memberId: string) => removeMember(groupId, memberId),
    onSuccess: () => {
      setRemoving(null);
      setActionError(null);
      return invalidateGroup(queryClient, groupId);
    },
    onError: (error) => setActionError(errorMessage(error)),
  });

  if (members.isPending) return <LoadingState />;
  if (members.isError)
    return <ErrorState error={members.error} onRetry={() => members.refetch()} />;

  const list = members.data.members;

  // Alias libres: cualquiera puede renombrarlos. Los reclamados, solo su dueño o un admin.
  const canRename = (member: GroupMember) =>
    member.user_id === null || member.id === me.id || isAdmin;

  return (
    <div className="flex flex-col gap-6">
      {actionError ? (
        <p role="alert" className="rounded-lg bg-negative/10 px-4 py-3 text-sm text-negative">
          {actionError}
        </p>
      ) : null}

      <ul className="card divide-y divide-line">
        {list.map((member) => {
          const isMe = member.id === me.id;
          const status = isMe ? "Tú" : member.user_id ? "Reclamado" : "Libre";
          return (
            <li
              key={member.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-ink">{member.alias}</span>
                {member.role === "admin" ? (
                  <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs text-accent-text">
                    Admin
                  </span>
                ) : null}
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${isMe ? "bg-positive/10 text-positive" : member.user_id ? "bg-surface-2 text-ink-soft" : "bg-warning/10 text-warning"}`}
                >
                  {status}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {!isMe && member.user_id === null ? (
                  <Button
                    variant="ghost"
                    onClick={() => claimMutation.mutate(member.id)}
                    disabled={claimMutation.isPending}
                    aria-label={`Usar el alias ${member.alias}`}
                  >
                    Soy yo
                  </Button>
                ) : null}
                {canRename(member) ? (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setActionError(null);
                      renameForm.reset({ alias: member.alias });
                      setRenaming(member);
                    }}
                    aria-label={`Renombrar ${member.alias}`}
                  >
                    Renombrar
                  </Button>
                ) : null}
                {isAdmin && !isMe ? (
                  <Button
                    variant="ghost"
                    className="text-negative"
                    onClick={() => setRemoving(member)}
                    aria-label={`Eliminar ${member.alias}`}
                  >
                    Eliminar
                  </Button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      <form
        onSubmit={addForm.handleSubmit((values) =>
          addMutation.mutate(
            values.aliasesText
              .split("\n")
              .map((line) => line.trim())
              .filter(Boolean),
          ),
        )}
        noValidate
        className="card flex flex-col gap-3 p-5"
      >
        <h2 className="font-medium text-ink">Añadir personas</h2>
        <p className="text-sm text-muted">
          Un alias por línea. Se crean sin reclamar: cuando la persona entre con el enlace de
          invitación, podrá elegir uno de ellos.
        </p>
        <Field label="Alias" error={addForm.formState.errors.aliasesText?.message}>
          {(props) => (
            <TextArea
              rows={3}
              placeholder={"Marta\nJavi"}
              {...props}
              {...addForm.register("aliasesText")}
            />
          )}
        </Field>
        <div className="flex justify-end">
          <Button type="submit" disabled={addMutation.isPending}>
            {addMutation.isPending ? "Añadiendo…" : "Añadir"}
          </Button>
        </div>
      </form>

      {renaming ? (
        <Modal title="Renombrar alias" onClose={() => setRenaming(null)}>
          <form
            onSubmit={renameForm.handleSubmit((values) =>
              renameMutation.mutate({ id: renaming.id, alias: values.alias }),
            )}
            noValidate
            className="flex flex-col gap-4"
          >
            <Field label="Nuevo alias" error={renameForm.formState.errors.alias?.message}>
              {(props) => <TextInput {...props} {...renameForm.register("alias")} />}
            </Field>
            {renameMutation.isError ? (
              <p role="alert" className="text-sm text-negative">
                {errorMessage(renameMutation.error)}
              </p>
            ) : null}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setRenaming(null)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={renameMutation.isPending}>
                Guardar
              </Button>
            </div>
          </form>
        </Modal>
      ) : null}

      {removing ? (
        <ConfirmDialog
          title="¿Eliminar este miembro?"
          message={`Se quitará a "${removing.alias}" del grupo. Si tiene gastos o pagos, la API lo impedirá.`}
          confirmLabel="Eliminar"
          pending={removeMutation.isPending}
          error={removeMutation.isError ? errorMessage(removeMutation.error) : undefined}
          onConfirm={() => removeMutation.mutate(removing.id)}
          onCancel={() => setRemoving(null)}
        />
      ) : null}
    </div>
  );
}
