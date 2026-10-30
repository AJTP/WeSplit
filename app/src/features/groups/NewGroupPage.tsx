import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router";
import { z } from "zod";
import { createGroup } from "../../api/groups";
import { Button } from "../../components/Button";
import { Field, TextArea, TextInput } from "../../components/Field";
import { PageHeader } from "../../components/PageHeader";
import { useCurrentUser } from "../../auth/useAuth";
import { errorMessage } from "../../lib/errors";
import { keys } from "../../lib/queryKeys";

const schema = z.object({
  name: z.string().trim().min(1, "Pon un nombre al grupo.").max(120, "Máximo 120 caracteres."),
  description: z.string().trim().max(500, "Máximo 500 caracteres."),
  alias: z.string().trim().min(1, "Elige tu alias en el grupo.").max(120, "Máximo 120 caracteres."),
  otherAliases: z.string(),
});

type FormValues = z.infer<typeof schema>;

// Una línea por alias. Los que se escriben aquí nacen sin reclamar.
function parseAliases(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function NewGroupPage() {
  const user = useCurrentUser();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", description: "", alias: user.name, otherAliases: "" },
  });

  const mutation = useMutation({
    mutationFn: createGroup,
    onSuccess: async (group) => {
      await queryClient.invalidateQueries({ queryKey: keys.groups });
      navigate(`/groups/${group.id}`);
    },
  });

  const onSubmit = handleSubmit((values) => {
    const others = parseAliases(values.otherAliases);
    const lowered = others.map((alias) => alias.toLowerCase());
    if (new Set(lowered).size !== lowered.length) {
      setError("otherAliases", { message: "Hay alias repetidos." });
      return;
    }
    if (lowered.includes(values.alias.toLowerCase())) {
      setError("otherAliases", { message: "Ese alias ya es el tuyo." });
      return;
    }
    if (others.length > 50) {
      setError("otherAliases", { message: "Máximo 50 alias adicionales." });
      return;
    }
    mutation.mutate({
      name: values.name,
      description: values.description || null,
      alias: values.alias,
      aliases: others.length > 0 ? others : undefined,
    });
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Nuevo grupo" subtitle="Serás su administrador." />
      <form onSubmit={onSubmit} noValidate className="card flex max-w-xl flex-col gap-4 p-6">
        <Field label="Nombre del grupo" error={errors.name?.message}>
          {(props) => <TextInput {...props} {...register("name")} />}
        </Field>
        <Field label="Descripción (opcional)" error={errors.description?.message}>
          {(props) => <TextArea rows={2} {...props} {...register("description")} />}
        </Field>
        <Field
          label="Tu alias en el grupo"
          hint="Así te verán los demás."
          error={errors.alias?.message}
        >
          {(props) => <TextInput {...props} {...register("alias")} />}
        </Field>
        <Field
          label="Otros alias (opcional)"
          hint="Uno por línea. Son personas que aún no están en la app; cuando se unan, reclamarán el suyo."
          error={errors.otherAliases?.message}
        >
          {(props) => (
            <TextArea
              rows={4}
              placeholder={"Marta\nJavi"}
              {...props}
              {...register("otherAliases")}
            />
          )}
        </Field>
        {mutation.isError ? (
          <p role="alert" className="text-sm text-negative">
            {errorMessage(mutation.error)}
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => navigate("/groups")}>
            Cancelar
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Creando…" : "Crear grupo"}
          </Button>
        </div>
      </form>
    </div>
  );
}
