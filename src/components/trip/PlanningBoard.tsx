'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  Plus,
  GripVertical,
  Sun,
  Cloud,
  CalendarDays,
  Loader2,
  ChevronDown,
  ChevronRight,
  X,
  MapPin,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  moveActivityAction,
  deleteActivityAction,
  upsertActivityAction,
  setDayCityAction,
} from '@/server/actions/tripDetail';

type Slot = 'morning' | 'afternoon' | 'day';

export interface PlanningDay {
  id: string;
  date: string; // YYYY-MM-DD
  title: string | null;
  stop_id: string | null;
}

export interface PlanningCity {
  id: string;
  name: string;
}

export interface PlanningActivity {
  id: string;
  day_id: string | null;
  title: string;
  description: string | null;
  time_slot: Slot;
}

interface Props {
  tripId: string;
  days: PlanningDay[];
  activities: PlanningActivity[];
  cities: PlanningCity[];
  canEdit: boolean;
}

const SLOTS: Array<{ key: Slot; label: string; Icon: typeof Sun }> = [
  { key: 'morning', label: 'Matin', Icon: Sun },
  { key: 'afternoon', label: 'Après-midi', Icon: Cloud },
  { key: 'day', label: 'Journée', Icon: CalendarDays },
];

export function PlanningBoard({ tripId, days, activities, cities, canEdit }: Props) {
  const router = useRouter();
  const [optimistic, setOptimistic] = React.useState(activities);
  const [draggingId, setDraggingId] = React.useState<string | null>(null);
  const [editing, setEditing] = React.useState<PlanningActivity | null>(null);

  React.useEffect(() => {
    setOptimistic(activities);
  }, [activities]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor),
  );

  function handleDragStart(e: DragStartEvent) {
    setDraggingId(String(e.active.id));
  }

  async function handleDragEnd(e: DragEndEvent) {
    setDraggingId(null);
    const activityId = String(e.active.id);
    const overId = e.over?.id ? String(e.over.id) : null;
    if (!overId) return;

    const [targetDayId, targetSlot] = overId.split('::') as [string, Slot];
    const activity = optimistic.find((a) => a.id === activityId);
    if (!activity) return;
    if (activity.day_id === targetDayId && activity.time_slot === targetSlot) return;

    setOptimistic((prev) =>
      prev.map((a) =>
        a.id === activityId ? { ...a, day_id: targetDayId, time_slot: targetSlot } : a,
      ),
    );

    const res = await moveActivityAction({
      activity_id: activityId,
      trip_id: tripId,
      day_id: targetDayId,
      time_slot: targetSlot,
    });
    if (!res.ok) {
      toast.error('Déplacement impossible', { description: res.error });
      setOptimistic((prev) =>
        prev.map((a) =>
          a.id === activityId ? { ...a, day_id: activity.day_id, time_slot: activity.time_slot } : a,
        ),
      );
    } else {
      router.refresh();
    }
  }

  if (days.length === 0) {
    return (
      <div className="rounded-xl border bg-muted/20 p-8 text-center text-sm text-muted-foreground">
        Ajoutez des dates à votre voyage pour démarrer le planning. Cliquez sur{' '}
        <b>Modifier</b> en haut de la page et renseignez une date de départ et de retour.
      </div>
    );
  }

  const draggingActivity = draggingId ? optimistic.find((a) => a.id === draggingId) : null;

  return (
    <>
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="space-y-3">
          {days.map((day, i) => (
            <DayPanel
              key={day.id}
              number={i + 1}
              day={day}
              tripId={tripId}
              cities={cities}
              activities={optimistic.filter((a) => a.day_id === day.id)}
              canEdit={canEdit}
              onEditActivity={setEditing}
            />
          ))}
        </div>
        <DragOverlay dropAnimation={null}>
          {draggingActivity && (
            <ActivityCard activity={draggingActivity} canEdit={false} dragging />
          )}
        </DragOverlay>
      </DndContext>

      {editing && (
        <EditActivityDialog
          activity={editing}
          tripId={tripId}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}

function DayPanel({
  number,
  day,
  tripId,
  cities,
  activities,
  canEdit,
  onEditActivity,
}: {
  number: number;
  day: PlanningDay;
  tripId: string;
  cities: PlanningCity[];
  activities: PlanningActivity[];
  canEdit: boolean;
  onEditActivity: (a: PlanningActivity) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const dateLabel = formatDate(day.date);
  const cityName = cities.find((c) => c.id === day.stop_id)?.name ?? null;

  return (
    <section className="overflow-hidden rounded-xl border bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 border-b bg-muted/30 px-4 py-2.5 text-left transition hover:bg-muted/50"
      >
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="font-serif text-lg font-semibold">Jour {number}</span>
          <span className="text-sm text-muted-foreground">{dateLabel}</span>
          {cityName && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              <MapPin className="size-3" /> {cityName}
            </span>
          )}
          {day.title && <span className="text-sm">· {day.title}</span>}
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          {activities.length > 0 && (
            <span className="text-xs">{activities.length} activité{activities.length > 1 ? 's' : ''}</span>
          )}
          {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        </div>
      </button>

      {open && (
        <>
          {canEdit && (
            <div className="flex items-center gap-2 border-b bg-background px-4 py-2 text-xs">
              <span className="text-muted-foreground">Ville&nbsp;:</span>
              <DayCitySelector day={day} tripId={tripId} cities={cities} />
            </div>
          )}
          <div className="grid gap-2 p-3 md:grid-cols-3">
            {SLOTS.map(({ key, label, Icon }) => (
              <SlotColumn
                key={key}
                day={day}
                slot={key}
                label={label}
                Icon={Icon}
                activities={activities.filter((a) => a.time_slot === key)}
                tripId={tripId}
                canEdit={canEdit}
                onEditActivity={onEditActivity}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function DayCitySelector({
  day,
  tripId,
  cities,
}: {
  day: PlanningDay;
  tripId: string;
  cities: PlanningCity[];
}) {
  const router = useRouter();
  const [value, setValue] = React.useState(day.stop_id ?? '');
  const [pending, setPending] = React.useState(false);

  async function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const v = e.target.value;
    setValue(v);
    setPending(true);
    const res = await setDayCityAction({
      day_id: day.id,
      trip_id: tripId,
      stop_id: v || null,
    });
    setPending(false);
    if (!res.ok) {
      toast.error('Maj impossible', { description: res.error });
      setValue(day.stop_id ?? '');
      return;
    }
    router.refresh();
  }

  if (cities.length === 0) {
    return (
      <span className="text-muted-foreground/70">
        Aucune ville. Ajoutez-en une depuis le header du voyage.
      </span>
    );
  }

  return (
    <select
      value={value}
      onChange={onChange}
      disabled={pending}
      className="h-7 rounded-md border border-input bg-background px-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    >
      <option value="">— Non assignée —</option>
      {cities.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  );
}

function SlotColumn({
  day,
  slot,
  label,
  Icon,
  activities,
  tripId,
  canEdit,
  onEditActivity,
}: {
  day: PlanningDay;
  slot: Slot;
  label: string;
  Icon: typeof Sun;
  activities: PlanningActivity[];
  tripId: string;
  canEdit: boolean;
  onEditActivity: (a: PlanningActivity) => void;
}) {
  const dropId = `${day.id}::${slot}`;
  const { isOver, setNodeRef } = useDroppable({ id: dropId });
  const [adding, setAdding] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const router = useRouter();

  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-32 flex-col gap-2 rounded-lg border bg-muted/20 p-2.5 transition ${
        isOver ? 'border-primary bg-primary/5' : ''
      }`}
    >
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <Icon className="size-3.5" /> {label}
        </div>
        {canEdit && !adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label={`Ajouter dans ${label}`}
          >
            <Plus className="size-4" />
          </button>
        )}
      </div>

      {activities.length === 0 && !adding && (
        <p className="px-1 py-2 text-xs text-muted-foreground/60">Vide</p>
      )}

      {activities.map((a) => (
        <ActivityCard
          key={a.id}
          activity={a}
          canEdit={canEdit}
          tripId={tripId}
          onEdit={() => onEditActivity(a)}
        />
      ))}

      {canEdit && adding && (
        <AddActivityForm
          onSubmit={async (title, comment) => {
            setPending(true);
            const res = await upsertActivityAction({
              trip_id: tripId,
              title: title.trim(),
              description: comment.trim() || null,
            });
            if (!res.ok || !res.data) {
              toast.error('Ajout impossible', { description: res.error });
              setPending(false);
              return;
            }
            // Now move it to the right day + slot (quickAdd defaults to day_id but slot='day').
            await moveActivityAction({
              activity_id: res.data.id,
              trip_id: tripId,
              day_id: day.id,
              time_slot: slot,
            });
            setAdding(false);
            setPending(false);
            router.refresh();
          }}
          onCancel={() => setAdding(false)}
          pending={pending}
        />
      )}
    </div>
  );
}

function AddActivityForm({
  onSubmit,
  onCancel,
  pending,
}: {
  onSubmit: (title: string, comment: string) => Promise<void>;
  onCancel: () => void;
  pending: boolean;
}) {
  const [title, setTitle] = React.useState('');
  const [comment, setComment] = React.useState('');

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!title.trim()) {
      onCancel();
      return;
    }
    await onSubmit(title, comment);
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-md border bg-background p-2 shadow-sm"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onCancel();
      }}
    >
      <Input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Titre"
        className="h-8 text-sm"
        disabled={pending}
      />
      <Textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Commentaire (optionnel)"
        rows={2}
        className="mt-1.5 min-h-16 text-xs"
        disabled={pending}
      />
      <div className="mt-1.5 flex justify-end gap-1">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={pending}>
          Annuler
        </Button>
        <Button type="submit" size="sm" disabled={pending || !title.trim()}>
          {pending ? <Loader2 className="size-3 animate-spin" /> : 'Ajouter'}
        </Button>
      </div>
    </form>
  );
}

function ActivityCard({
  activity,
  canEdit,
  tripId,
  dragging,
  onEdit,
}: {
  activity: PlanningActivity;
  canEdit: boolean;
  tripId?: string;
  dragging?: boolean;
  onEdit?: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: activity.id,
    disabled: !canEdit,
  });
  const router = useRouter();
  const [deleting, setDeleting] = React.useState(false);

  async function onDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (!tripId) return;
    if (!window.confirm(`Supprimer "${activity.title}" ?`)) return;
    setDeleting(true);
    const res = await deleteActivityAction(activity.id);
    if (!res.ok) {
      toast.error('Suppression impossible', { description: res.error });
      setDeleting(false);
      return;
    }
    router.refresh();
  }

  return (
    <div
      ref={setNodeRef}
      onClick={onEdit && !dragging ? onEdit : undefined}
      className={`group flex cursor-pointer items-start gap-1.5 rounded-md border bg-background p-2 text-sm shadow-sm transition hover:border-primary/40 ${
        isDragging || dragging ? 'opacity-50' : ''
      }`}
    >
      {canEdit && (
        <button
          type="button"
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          className="cursor-grab touch-none rounded p-0.5 text-muted-foreground hover:bg-muted active:cursor-grabbing"
          aria-label="Déplacer"
        >
          <GripVertical className="size-4" />
        </button>
      )}
      <div className="min-w-0 flex-1">
        <p className="break-words font-medium">{activity.title}</p>
        {activity.description && (
          <p className="mt-0.5 whitespace-pre-wrap break-words text-xs text-muted-foreground">
            {activity.description}
          </p>
        )}
      </div>
      {canEdit && tripId && !dragging && (
        <button
          type="button"
          onClick={onDelete}
          disabled={deleting}
          className="opacity-0 transition group-hover:opacity-100 text-muted-foreground hover:text-destructive"
          aria-label="Supprimer"
        >
          {deleting ? <Loader2 className="size-3.5 animate-spin" /> : <X className="size-3.5" />}
        </button>
      )}
    </div>
  );
}

function EditActivityDialog({
  activity,
  tripId,
  onClose,
}: {
  activity: PlanningActivity;
  tripId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [title, setTitle] = React.useState(activity.title);
  const [description, setDescription] = React.useState(activity.description ?? '');
  const [pending, setPending] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setPending(true);
    const res = await upsertActivityAction({
      id: activity.id,
      trip_id: tripId,
      title: title.trim(),
      description: description.trim() || null,
    });
    if (!res.ok) {
      toast.error('Enregistrement impossible', { description: res.error });
      setPending(false);
      return;
    }
    toast.success('Activité modifiée');
    onClose();
    router.refresh();
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Modifier l’activité</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="pb-title">Titre</Label>
            <Input
              id="pb-title"
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={pending}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pb-desc">Commentaire</Label>
            <Textarea
              id="pb-desc"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={pending}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
              Annuler
            </Button>
            <Button type="submit" disabled={pending || !title.trim()}>
              {pending && <Loader2 className="size-4 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso + 'T00:00:00Z').toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}
