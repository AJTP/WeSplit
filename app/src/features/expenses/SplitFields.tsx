import { formatMoney, splitEqual } from "../../lib/money";
import { TextInput } from "../../components/Field";
import type { SplitMode } from "./computeShares";

export interface SplitMember {
  id: string;
  alias: string;
}

interface SplitFieldsProps {
  members: SplitMember[];
  participants: string[];
  onParticipantsChange: (ids: string[]) => void;
  mode: SplitMode;
  onModeChange: (mode: SplitMode) => void;
  values: Record<string, string>;
  onValuesChange: (values: Record<string, string>) => void;
  totalCents: number | null;
  error?: string;
}

const modes: { value: SplitMode; label: string }[] = [
  { value: "equal", label: "Partes iguales" },
  { value: "amounts", label: "Importes" },
  { value: "percent", label: "Porcentajes" },
];

export function SplitFields({
  members,
  participants,
  onParticipantsChange,
  mode,
  onModeChange,
  values,
  onValuesChange,
  totalCents,
  error,
}: SplitFieldsProps) {
  const selected = members.filter((member) => participants.includes(member.id));
  const equalPreview =
    mode === "equal" && totalCents !== null
      ? splitEqual(
          totalCents,
          selected.map((member) => member.id),
        )
      : null;

  const toggle = (id: string) =>
    onParticipantsChange(
      participants.includes(id)
        ? participants.filter((item) => item !== id)
        : [...participants, id],
    );

  return (
    <fieldset className="flex flex-col gap-4 rounded-xl border border-line p-4">
      <legend className="px-1 text-sm font-medium text-ink-soft">Reparto</legend>

      <div className="flex flex-col gap-2">
        <span className="text-sm text-ink-soft">¿Entre quién?</span>
        <div className="flex flex-wrap gap-2">
          {members.map((member) => (
            <label
              key={member.id}
              className={`cursor-pointer rounded-full px-3 py-1 text-sm ring-1 ring-inset has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent ${participants.includes(member.id) ? "bg-accent/10 text-accent-text ring-accent/50" : "text-ink-soft ring-line"}`}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={participants.includes(member.id)}
                onChange={() => toggle(member.id)}
              />
              {member.alias}
            </label>
          ))}
        </div>
      </div>

      <div role="radiogroup" aria-label="Modo de reparto" className="flex flex-wrap gap-2">
        {modes.map((option) => (
          <label
            key={option.value}
            className={`cursor-pointer rounded-lg px-3 py-1.5 text-sm ring-1 ring-inset has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent ${mode === option.value ? "bg-ink text-canvas ring-ink" : "bg-surface text-ink-soft ring-line"}`}
          >
            <input
              type="radio"
              name="split-mode"
              className="sr-only"
              value={option.value}
              checked={mode === option.value}
              onChange={() => onModeChange(option.value)}
            />
            {option.label}
          </label>
        ))}
      </div>

      {mode === "equal" ? (
        <ul className="flex flex-col gap-1 text-sm text-ink-soft">
          {selected.map((member) => (
            <li key={member.id} className="flex justify-between">
              <span>{member.alias}</span>
              <span className="tabular-nums">
                {equalPreview?.get(member.id) !== undefined
                  ? formatMoney((equalPreview.get(member.id) ?? 0) / 100)
                  : "—"}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {selected.map((member) => (
            <label key={member.id} className="flex flex-col gap-1 text-sm text-ink-soft">
              {mode === "amounts"
                ? `Importe de ${member.alias} (€)`
                : `Porcentaje de ${member.alias} (%)`}
              <TextInput
                inputMode="decimal"
                value={values[member.id] ?? ""}
                onChange={(event) => onValuesChange({ ...values, [member.id]: event.target.value })}
              />
            </label>
          ))}
        </div>
      )}

      {error ? (
        <p role="alert" className="text-sm text-negative">
          {error}
        </p>
      ) : totalCents !== null && mode === "equal" && selected.length > 0 ? (
        <p className="text-xs text-muted">Total repartido: {formatMoney(totalCents / 100)}</p>
      ) : null}
    </fieldset>
  );
}
