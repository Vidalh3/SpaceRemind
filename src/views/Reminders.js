// Reminders view — Material 3 redesign. Lists open reminders in modern
// cards with custom badges for deadlines and rounded action controls.
import { listOpenReminders, updateReminder, deleteReminder } from "../api/places.js";
import { el, emptyState, toast } from "../components/ui.js";

function formatDue(dueAt) {
  const date = dueAt?.toDate ? dueAt.toDate() : dueAt;
  if (!date) return "";
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function reminderRow(doc, onChanged) {
  const r = doc.data();
  const overdue = r.dueAt?.toDate && r.dueAt.toDate() < new Date();
  
  // Custom Material 3 badge for the due date
  const badge = overdue
    ? el("span", { class: "inline-flex items-center gap-1 rounded-full border border-rose-900/40 bg-rose-950/45 px-2.5 py-1 text-[10px] font-black text-rose-350 tracking-wider uppercase mt-1.5" }, ["⚠️ Overdue · ", formatDue(r.dueAt)])
    : el("span", { class: "inline-flex items-center gap-1 rounded-full border border-slate-800 bg-slate-800/60 px-2.5 py-1 text-[10px] font-bold text-slate-400 mt-1.5" }, ["⏰ ", formatDue(r.dueAt)]);

  return el("div", { class: "flex items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-4 shadow-sm backdrop-blur-sm" }, [
    el("div", { class: "flex-1 flex flex-col items-start" }, [
      el("p", { class: "font-bold text-slate-200 text-sm tracking-wide text-left" }, r.title),
      badge,
    ]),
    el("div", { class: "flex gap-2" }, [
      el(
        "button",
        {
          class: "rounded-full bg-slate-850 hover:bg-emerald-950/80 border border-slate-850 hover:border-emerald-800 h-8 w-8 flex items-center justify-center text-xs text-emerald-400 transition active:scale-90 shadow-sm",
          title: "Mark done",
          onClick: async () => {
            await updateReminder(doc.id, { done: true });
            toast("Marked done", "success");
            onChanged();
          },
        },
        "✓"
      ),
      el(
        "button",
        {
          class: "rounded-full bg-slate-850 hover:bg-rose-950/80 border border-slate-850 hover:border-rose-800 h-8 w-8 flex items-center justify-center text-xs text-rose-450 transition active:scale-90 shadow-sm",
          title: "Delete",
          onClick: async () => {
            await deleteReminder(doc.id);
            toast("Reminder deleted", "success");
            onChanged();
          },
        },
        "🗑"
      ),
    ]),
  ]);
}

export async function renderReminders() {
  const list = el("div", { class: "flex flex-col gap-3" });
  const reload = async () => {
    const snap = await listOpenReminders();
    if (snap.empty) {
      list.replaceChildren(emptyState("No open reminders. You're all caught up!"));
    } else {
      list.replaceChildren(...snap.docs.map((d) => reminderRow(d, reload)));
    }
  };
  await reload();

  return el("section", { class: "flex flex-col gap-4 px-4 py-4 min-h-[calc(100vh-160px)]" }, [
    el("div", {}, [
      el("h2", { class: "text-xl font-black text-slate-100 tracking-tight" }, "Reminders"),
      el("p", { class: "text-xs text-slate-400 mt-1 font-medium" }, "Open reminders for your items and places."),
    ]),
    list,
  ]);
}
