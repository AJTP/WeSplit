import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { createCategory, deleteCategory, updateCategory } from "../../api/categories";
import type { Category } from "../../api/types";
import { Button } from "../../components/Button";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { Field, TextInput } from "../../components/Field";
import { Modal } from "../../components/Modal";
import { PageHeader } from "../../components/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "../../components/States";
import { errorMessage } from "../../lib/errors";
import { keys } from "../../lib/queryKeys";
import { useCategories } from "./useCategories";

const DEFAULT_COLOR = "#6366f1";

const schema = z.object({
  name: z.string().trim().min(1, "Pon un nombre.").max(80, "Máximo 80 caracteres."),
  useColor: z.boolean(),
  color: z.string(),
});

type FormValues = z.infer<typeof schema>;

function Swatch({ color }: { color: string | null }) {
  return (
    <span
      aria-hidden="true"
      className="inline-block size-3 rounded-full ring-1 ring-line"
      style={{ backgroundColor: color ?? "transparent" }}
    />
  );
}

// Crear o editar una categoría propia. Al editar, `category` viene relleno.
function CategoryForm({
  category,
  onSaved,
  onCancel,
  title,
}: {
  category?: Category;
  onSaved: () => void;
  onCancel?: () => void;
  title: string;
}) {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: category?.name ?? "",
      useColor: Boolean(category?.color),
      color: category?.color ?? DEFAULT_COLOR,
    },
  });
  const useColor = watch("useColor");

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const color = values.useColor ? values.color : null;
      if (category) return updateCategory(category.id, { name: values.name, color });
      return createCategory({ name: values.name, ...(color ? { color } : {}) });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: keys.categories });
      reset();
      onSaved();
    },
  });

  return (
    <form
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
      noValidate
      className="flex flex-col gap-4"
      aria-label={title}
    >
      <Field label="Nombre" error={errors.name?.message}>
        {(props) => <TextInput {...props} {...register("name")} />}
      </Field>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-ink-soft">
          <input type="checkbox" {...register("useColor")} />
          Usar color
        </label>
        {useColor ? (
          <input
            type="color"
            aria-label="Color de la categoría"
            className="h-9 w-14 cursor-pointer rounded border border-line"
            {...register("color")}
          />
        ) : null}
      </div>
      {mutation.isError ? (
        <p role="alert" className="text-sm text-negative">
          {errorMessage(mutation.error)}
        </p>
      ) : null}
      <div className="flex justify-end gap-2">
        {onCancel ? (
          <Button variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
        ) : null}
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Guardando…" : category ? "Guardar" : "Crear categoría"}
        </Button>
      </div>
    </form>
  );
}

export function CategoriesPage() {
  const categories = useCategories();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Category | null>(null);
  const [removing, setRemoving] = useState<Category | null>(null);

  const removeMutation = useMutation({
    mutationFn: (categoryId: string) => deleteCategory(categoryId),
    onSuccess: async () => {
      setRemoving(null);
      // Los gastos que usaban la categoría la pierden: hay que refrescar sus listas.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: keys.categories }),
        queryClient.invalidateQueries({ queryKey: ["personal-expenses"] }),
        queryClient.invalidateQueries({ queryKey: ["personal-expense"] }),
        queryClient.invalidateQueries({ queryKey: ["group-expenses"] }),
        queryClient.invalidateQueries({ queryKey: ["group-expense"] }),
      ]);
    },
  });

  if (categories.isPending) return <LoadingState />;
  if (categories.isError)
    return <ErrorState error={categories.error} onRetry={() => categories.refetch()} />;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Categorías"
        subtitle="Las predefinidas son comunes a todos. Las tuyas solo las ves tú."
      />

      <section className="card flex flex-col gap-3 p-5">
        <h2 className="font-medium text-ink">Mis categorías</h2>
        {categories.own.length === 0 ? (
          <EmptyState title="Aún no tienes categorías propias." />
        ) : (
          <ul className="divide-y divide-line">
            {categories.own.map((category) => (
              <li key={category.id} className="flex items-center justify-between gap-3 py-2">
                <span className="flex items-center gap-2 text-ink-soft">
                  <Swatch color={category.color} />
                  {category.name}
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    onClick={() => setEditing(category)}
                    aria-label={`Editar ${category.name}`}
                  >
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    className="text-negative"
                    onClick={() => setRemoving(category)}
                    aria-label={`Eliminar ${category.name}`}
                  >
                    Eliminar
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="border-t border-line pt-4">
          <CategoryForm title="Nueva categoría" onSaved={() => undefined} />
        </div>
      </section>

      <section className="card p-5">
        <h2 className="mb-2 font-medium text-ink">Predefinidas</h2>
        <ul className="flex flex-wrap gap-2">
          {categories.predefined.map((category) => (
            <li
              key={category.id}
              className="rounded-full bg-surface-2 px-3 py-1 text-sm text-ink-soft"
            >
              {category.name}
            </li>
          ))}
        </ul>
      </section>

      {editing ? (
        <Modal title="Editar categoría" onClose={() => setEditing(null)}>
          <CategoryForm
            key={editing.id}
            title="Editar categoría"
            category={editing}
            onSaved={() => setEditing(null)}
            onCancel={() => setEditing(null)}
          />
        </Modal>
      ) : null}

      {removing ? (
        <ConfirmDialog
          title="¿Eliminar la categoría?"
          message={`Los gastos con "${removing.name}" quedarán sin categoría.`}
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
