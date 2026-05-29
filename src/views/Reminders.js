// Reminders view — lists the user's open reminders ordered by due date,
// with the option to mark each done or delete it.
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
  return el("div", { class: "flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900 p-3" }, [
    el("div", {}, [
      el("p", { class: "font-medium" }, r.title),
      el("p", { class: `text-xs ${overdue ? "text-rose-400" : "text-slate-500"}` },
        `${overdue ? "Overdue · " : ""}${formatDue(r.dueAt)}`),
    ]),
    el("div", { class: "flex gap-1" }, [
      el(
        "button",
        {
          class: "rounded-md px-2 py-1 text-xs text-emerald-400 hover:bg-slate-800",
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
          class: "rounded-md px-2 py-1 text-xs text-rose-400 hover:bg-slate-800",
          title: "Delete",
          onClick: async () => {
            await deleteReminder(doc.id);
            onChanged();
          },
        },
        "🗑"
      ),
    ]),
  ]);
}

export async function renderReminders() {
  const list = el("div", { class: "flex flex-col gap-2" });
  const reload = async () => {
    const snap = await listOpenReminders();
    if (snap.empty) {
      list.replaceChildren(emptyState("No open reminders."));
    } else {
      list.replaceChildren(...snap.docs.map((d) => reminderRow(d, reload)));
    }
  };
  await reload();

  return el("section", { class: "flex flex-col gap-4 px-4 py-4" }, [
    el("div", {}, [
      el("h2", { class: "text-lg font-semibold" }, "Reminders"),
      el("p", { class: "text-sm text-slate-400" }, "Open reminders for your items and places."),
    ]),
    list,
  ]);
}
