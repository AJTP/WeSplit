import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router";
import { z } from "zod";
import { deleteGroup, getInvitationToken, updateGroup } from "../../api/groups";
import { Button } from "../../components/Button";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { Field, TextArea, TextInput } from "../../components/Field";
import { ErrorState, LoadingState } from "../../components/States";
import { errorMessage } from "../../lib/errors";
import { invalidateGroup, keys } from "../../lib/queryKeys";
import { useGroup } from "./useGroup";

const schema = z.object({
  name: z.string().trim().min(1, "Pon un nombre al grupo.").max(120, "Máximo 120 caracteres."),
  description: z.string().trim().max(500, "Máximo 500 caracteres."),
});

type FormValues = z.infer<typeof schema>;

export function GroupSettingsPage() {
  const { groupId, userGroup, isAdmin } = useGroup();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const invitation = useQuery({
    queryKey: keys.invitation(groupId),
    queryFn: () => getInvitationToken(groupId),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: userGroup.group.name,
      description: userGroup.group.description ?? "",
    },
  });

  const saveMutation = useMutation({
    mutationFn: (values: FormValues) =>
      updateGroup(groupId, { name: values.name, description: values.description || null }),
    onSuccess: (_group, values) => {
      // Los valores guardados pasan a ser la referencia: el formulario deja de estar sucio.
      reset(values);
      return invalidateGroup(queryClient, groupId);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteGroup(groupId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: keys.groups });
      navigate("/groups", { replace: true });
    },
  });

  const link = invitation.data ? `${window.location.origin}/invite/${invitation.data.token}` : "";

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false); // sin permiso del portapapeles: el enlace queda visible para copiarlo a mano
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="card flex flex-col gap-3 p-5">
        <h2 className="font-medium text-ink">Enlace de invitación</h2>
        <p className="text-sm text-muted">
          Compártelo para que otros se unan. Quien lo abra elegirá uno de los alias libres del
          grupo. El enlace no caduca.
        </p>
        {invitation.isPending ? <LoadingState /> : null}
        {invitation.isError ? <ErrorState error={invitation.error} /> : null}
        {invitation.data ? (
          <div className="flex flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-lg bg-surface-2 px-3 py-2 text-sm text-ink-soft">
              {link}
            </code>
            <Button variant="secondary" onClick={copyLink}>
              {copied ? "Copiado" : "Copiar"}
            </Button>
          </div>
        ) : null}
      </section>

      <section className="card flex flex-col gap-4 p-5">
        <h2 className="font-medium text-ink">Datos del grupo</h2>
        {isAdmin ? (
          <form
            onSubmit={handleSubmit((values) => saveMutation.mutate(values))}
            noValidate
            className="flex flex-col gap-4"
          >
            <Field label="Nombre" error={errors.name?.message}>
              {(props) => <TextInput {...props} {...register("name")} />}
            </Field>
            <Field label="Descripción" error={errors.description?.message}>
              {(props) => <TextArea rows={3} {...props} {...register("description")} />}
            </Field>
            {saveMutation.isError ? (
              <p role="alert" className="text-sm text-negative">
                {errorMessage(saveMutation.error)}
              </p>
            ) : null}
            {saveMutation.isSuccess && !isDirty ? (
              <p role="status" className="text-sm text-positive">
                Cambios guardados.
              </p>
            ) : null}
            <div className="flex justify-end">
              <Button type="submit" disabled={saveMutation.isPending || !isDirty}>
                {saveMutation.isPending ? "Guardando…" : "Guardar cambios"}
              </Button>
            </div>
          </form>
        ) : (
          <p className="text-sm text-muted">Solo los administradores pueden editar el grupo.</p>
        )}
      </section>

      {isAdmin ? (
        <section className="card flex flex-col gap-3 border border-negative/30 p-5">
          <h2 className="font-medium text-negative">Zona de peligro</h2>
          <p className="text-sm text-ink-soft">
            Eliminar el grupo borra también sus gastos y pagos. No se puede deshacer.
          </p>
          <div>
            <Button variant="danger" onClick={() => setConfirmingDelete(true)}>
              Eliminar grupo
            </Button>
          </div>
        </section>
      ) : null}

      {confirmingDelete ? (
        <ConfirmDialog
          title="¿Eliminar el grupo?"
          message={`Se borrarán "${userGroup.group.name}" con todos sus gastos y pagos.`}
          confirmLabel="Eliminar grupo"
          pending={deleteMutation.isPending}
          error={deleteMutation.isError ? errorMessage(deleteMutation.error) : undefined}
          onConfirm={() => deleteMutation.mutate()}
          onCancel={() => setConfirmingDelete(false)}
        />
      ) : null}
    </div>
  );
}
