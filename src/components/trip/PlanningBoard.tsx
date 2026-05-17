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
import { Plus, GripVertical, Sun, Cloud, CalendarDays, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  quickAddActivityAction,
  moveActivityAction,
  deleteActivityAction,
} from '@/server/actions/tripDetail';

type Slot = 'morning' | 'afternoon' | 'day';

export interface PlanningDay {
  id: string;
  date: string; // YYYY-MM-DD
  title: string | null;
}

export interface PlanningActivity {
  id: string;
  day_id: string | null;
  title: string;
  time_slot: Slot;
}

interface Props {
  tripId: string;
  days: PlanningDay[];
  activities: PlanningActivity[];
  canEdit: boolean;
}

const SLOTS: Array<{ key: Slot; label: string; Icon: typeof Sun }> = [
  { key: 'morning', label: 'Matin', Icon: Sun },
  { key: 'afternoon', label: 'Après-midi', Icon: Cloud },
  { key: 'day', label: 'Journée', Icon: CalendarDays },
];

export function PlanningBoard({ tripId, days, activities, canEdit }: Props) {
  const router = useRouter();
  const [optimistic, setOptimistic] = React.useState(activities);
  const [draggingId, setDraggingId] = React.useState<string | null>(null);

  // Sync optimistic state when server data changes (after refresh).
  React.useEffect(() => {
    setOptimistic(activities);
  }, [activities]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 }, // avoid hijacking simple clicks
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 6 }, // long-press on mobile
    }),
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

    // over id format: `${day_id}::${slot}`
    const [targetDayId, targetSlot] = overId.split('::') as [string, Slot];
    const activity = optimistic.find((a) => a.id === activityId);
    if (!activity) return;
    if (activity.day_id === targetDayId && activity.time_slot === targetSlot) return;

    // Optimistic UI update
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
      // Revert
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
      <div className="rounded-lg border bg-muted/20 p-8 text-center text-sm text-muted-foreground">
        Aucun jour planifié. Ajoutez d&apos;abord des jours dans la section ci-dessous pour pouvoir
        créer des activités.
      </div>
    );
  }

  const draggingActivity = draggingId ? optimistic.find((a) => a.id === draggingId) : null;

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="space-y-4">
        {days.map((day) => (
          <DayBoard
            key={day.id}
            day={day}
            tripId={tripId}
            activities={optimistic.filter((a) => a.day_id === day.id)}
            canEdit={canEdit}
          />
        ))}
      </div>
      <DragOverlay dropAnimation={null}>
        {draggingActivity && <ActivityCard activity={draggingActivity} canEdit={false} dragging />}
      </DragOverlay>
    </DndContext>
  );
}

function DayBoard({
  day,
  tripId,
  activities,
  canEdit,
}: {
  day: PlanningDay;
  tripId: string;
  activities: PlanningActivity[];
  canEdit: boolean;
}) {
  const [adding, setAdding] = React.useState(false);
  const [title, setTitle] = React.useState('');
  const [pending, setPending] = React.useState(false);
  const router = useRouter();

  const dateLabel = formatDate(day.date);

  async function submitNew(e?: React.FormEvent) {
    e?.preventDefault();
    const t = title.trim();
    if (!t) {
      setAdding(false);
      setTitle('');
      return;
    }
    setPending(true);
    const res = await quickAddActivityAction({ trip_id: tripId, day_id: day.id, title: t });
    setPending(false);
    if (!res.ok) {
      toast.error('Ajout impossible', { description: res.error });
      return;
    }
    setTitle('');
    setAdding(false);
    router.refresh();
  }

  return (
    <section className="overflow-hidden rounded-xl border bg-card">
      <header className="flex items-center justify-between gap-2 border-b bg-muted/30 px-4 py-2.5">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{dateLabel}</p>
          {day.title && <p className="text-sm font-medium">{day.title}</p>}
        </div>
        {canEdit && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setAdding((v) => !v)}
            disabled={pending}
          >
            <Plus className="size-4" /> Ajouter
          </Button>
        )}
      </header>

      {canEdit && adding && (
        <form onSubmit={submitNew} className="flex gap-2 border-b bg-background px-4 py-2">
          <Input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => {
              if (!title.trim()) setAdding(false);
            }}
            placeholder="Que voulez-vous faire ce jour-là&nbsp;?"
            className="h-9"
          />
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : 'OK'}
          </Button>
        </form>
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
          />
        ))}
      </div>
    </section>
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
}: {
  day: PlanningDay;
  slot: Slot;
  label: string;
  Icon: typeof Sun;
  activities: PlanningActivity[];
  tripId: string;
  canEdit: boolean;
}) {
  const dropId = `${day.id}::${slot}`;
  const { isOver, setNodeRef } = useDroppable({ id: dropId });

  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-32 flex-col gap-1.5 rounded-lg border bg-muted/20 p-2 transition ${
        isOver ? 'border-primary bg-primary/5' : ''
      }`}
    >
      <div className="flex items-center gap-1.5 px-1 text-xs font-medium text-muted-foreground">
        <Icon className="size-3.5" /> {label}
      </div>
      {activities.length === 0 ? (
        <p className="px-1 py-3 text-xs text-muted-foreground/60">Vide</p>
      ) : (
        activities.map((a) => (
          <ActivityCard key={a.id} activity={a} canEdit={canEdit} tripId={tripId} />
        ))
      )}
    </div>
  );
}

function ActivityCard({
  activity,
  canEdit,
  tripId,
  dragging,
}: {
  activity: PlanningActivity;
  canEdit: boolean;
  tripId?: string;
  dragging?: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: activity.id,
    disabled: !canEdit,
  });
  const router = useRouter();
  const [deleting, setDeleting] = React.useState(false);

  async function onDelete() {
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
      className={`group flex items-start gap-1.5 rounded-md border bg-background p-2 text-sm shadow-sm transition ${
        isDragging || dragging ? 'opacity-50' : ''
      }`}
    >
      {canEdit && (
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab touch-none rounded p-0.5 text-muted-foreground hover:bg-muted active:cursor-grabbing"
          aria-label="Déplacer"
        >
          <GripVertical className="size-4" />
        </button>
      )}
      <span className="flex-1 min-w-0 break-words">{activity.title}</span>
      {canEdit && tripId && !dragging && (
        <button
          type="button"
          onClick={onDelete}
          disabled={deleting}
          className="opacity-0 transition group-hover:opacity-100 text-muted-foreground hover:text-destructive"
          aria-label="Supprimer"
        >
          {deleting ? <Loader2 className="size-3.5 animate-spin" /> : '×'}
        </button>
      )}
    </div>
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
