// Settings view — user preferences & household collaboration management.
import { el, toast, primaryButton } from "../components/ui.js";
import {
  getTheme,
  setTheme,
  getDensity,
  setDensity,
  getArtwork,
  setArtwork,
} from "../utils/settings.js";
import {
  getOwnedHousehold,
  getJoinedHousehold,
  createHousehold,
  inviteMember,
  listAvailableSpaces,
} from "../api/spaces.js";
import { logActivity } from "../api/places.js";

export async function renderSettings() {
  const container = el("section", { class: "flex flex-col gap-6 px-4 py-4 min-h-[calc(100vh-160px)]" }, [
    el("div", {}, [
      el("h2", { class: "text-xl font-black text-slate-100 tracking-tight" }, "Settings"),
      el("p", { class: "text-xs text-slate-400 mt-1 font-medium" }, "Personalize your SpaceRemind experience and manage household sharing."),
    ]),
  ]);

  // --- SECTION 1: APPEARANCE ---
  const currentTheme = getTheme();
  const themeSelect = el("select", {
    class: "w-full rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-sm text-slate-100 focus:border-brand focus:outline-none transition-colors",
    onChange: (e) => {
      setTheme(e.target.value);
      toast(`Theme switched to ${e.target.value}.`, "info");
    }
  }, [
    el("option", { value: "dark", selected: currentTheme === "dark" }, "Dark Mode"),
    el("option", { value: "light", selected: currentTheme === "light" }, "Light Mode"),
  ]);

  const currentDensity = getDensity();
  const densitySelect = el("select", {
    class: "w-full rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-sm text-slate-100 focus:border-brand focus:outline-none transition-colors",
    onChange: (e) => {
      setDensity(e.target.value);
      toast(`Density layout updated.`, "info");
    }
  }, [
    el("option", { value: "comfortable", selected: currentDensity === "comfortable" }, "Comfortable Padding"),
    el("option", { value: "compact", selected: currentDensity === "compact" }, "Compact Padding"),
  ]);

  const currentArtwork = getArtwork();
  const artworkSelect = el("select", {
    class: "w-full rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-sm text-slate-100 focus:border-brand focus:outline-none transition-colors",
    onChange: (e) => {
      setArtwork(e.target.value);
      toast(`Artwork style updated.`, "info");
    }
  }, [
    el("option", { value: "rich", selected: currentArtwork === "rich" }, "Rich Artwork (Icons & Illustrations)"),
    el("option", { value: "minimal", selected: currentArtwork === "minimal" }, "Minimal (Text only)"),
  ]);

  const appearanceCard = el("div", { class: "rounded-2xl border border-slate-800 bg-slate-900/40 p-4 shadow-sm backdrop-blur-sm space-y-4" }, [
    el("h3", { class: "text-sm font-bold text-slate-200 tracking-wide" }, "Appearance & Display"),
    el("div", { class: "space-y-3" }, [
      el("div", {}, [
        el("label", { class: "block text-xs text-slate-400 font-bold mb-1.5" }, "Theme Color"),
        themeSelect
      ]),
      el("div", {}, [
        el("label", { class: "block text-xs text-slate-400 font-bold mb-1.5" }, "Display Density"),
        densitySelect
      ]),
      el("div", {}, [
        el("label", { class: "block text-xs text-slate-400 font-bold mb-1.5" }, "Artwork Style"),
        artworkSelect
      ])
    ])
  ]);
  container.append(appearanceCard);

  // --- SECTION 2: HOUSEHOLD COLLABORATION ---
  const householdContainer = el("div");
  container.append(householdContainer);

  const refreshHouseholdSection = async () => {
    householdContainer.replaceChildren(el("div", { class: "text-center py-6 text-sm text-slate-400" }, "Loading space configuration…"));

    try {
      const owned = await getOwnedHousehold();
      const joined = await getJoinedHousehold();
      const active = owned || joined;

      if (active) {
        const isOwner = owned ? true : false;
        const data = active.data();
        const members = data.memberEmails || [];

        const membersList = el("div", { class: "space-y-1.5 mt-2" });
        if (members.length === 0) {
          membersList.append(el("p", { class: "text-xs text-slate-500 italic" }, "No household members invited yet."));
        } else {
          members.forEach((m) => {
            membersList.append(
              el("div", { class: "flex items-center justify-between rounded-lg bg-slate-800/50 px-3 py-1.5 border border-slate-800 text-xs font-semibold text-slate-300" }, [
                el("span", {}, m),
                el("span", { class: "text-[10px] uppercase tracking-wider text-slate-500 font-bold" }, "Member")
              ])
            );
          });
        }

        let inviteBlock = el("div");
        if (isOwner) {
          const inviteInput = el("input", {
            type: "email",
            placeholder: "family.member@example.com",
            class: "w-full rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-brand focus:outline-none transition-colors",
          });
          const inviteBtn = primaryButton("Send Invite", async () => {
            const email = inviteInput.value.trim();
            if (!email) return;
            if (members.length >= 3) {
              toast("Maximum member count of 3 reached.", "error");
              return;
            }
            try {
              inviteBtn.disabled = true;
              const mailUrl = await inviteMember(active.id, email);
              toast(`Invited ${email}! Opening email draft...`, "success");
              window.open(mailUrl, "_blank");
              inviteInput.value = "";
              await refreshHouseholdSection();
            } catch (err) {
              toast(err.message || "Invitation failed.", "error");
            } finally {
              inviteBtn.disabled = false;
            }
          });

          inviteBlock = el("div", { class: "border-t border-slate-800 pt-3 mt-3 space-y-2.5" }, [
            el("label", { class: "block text-xs text-slate-400 font-bold" }, `Invite Family Member (${members.length}/3)`),
            inviteInput,
            inviteBtn
          ]);
        } else {
          inviteBlock = el("p", { class: "text-[11px] text-slate-500 italic pt-2 mt-2 border-t border-slate-800" }, "Only the space owner can invite new members.");
        }

        const sharedSpaceCard = el("div", { class: "rounded-2xl border border-slate-800 bg-slate-900/40 p-4 shadow-sm backdrop-blur-sm space-y-3" }, [
          el("div", { class: "flex items-center justify-between" }, [
            el("h3", { class: "text-sm font-bold text-slate-200 tracking-wide" }, "Shared Space Info"),
            el("span", { class: "rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400 uppercase tracking-wider border border-emerald-500/25" }, "Active")
          ]),
          el("div", { class: "space-y-1.5" }, [
            el("p", { class: "text-xs font-semibold text-slate-300" }, `Name: ${data.name}`),
            el("p", { class: "text-[11px] text-slate-500" }, `Owner ID: ${data.ownerId === auth.currentUser?.uid ? "You" : data.ownerId}`),
          ]),
          el("div", { class: "pt-2 space-y-1.5" }, [
            el("label", { class: "block text-xs text-slate-400 font-bold" }, "Household Members"),
            membersList
          ]),
          inviteBlock
        ]);

        householdContainer.replaceChildren(sharedSpaceCard);
      } else {
        // Render household creation form
        const nameInput = el("input", {
          type: "text",
          placeholder: "e.g. Smith Household",
          class: "w-full rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-brand focus:outline-none transition-colors",
        });

        const createBtn = primaryButton("Create Shared Household", async () => {
          const name = nameInput.value.trim();
          if (!name) return;
          try {
            createBtn.disabled = true;
            await createHousehold(name);
            await logActivity(`Created shared household "${name}"`);
            toast(`Created shared household space "${name}"!`, "success");
            await refreshHouseholdSection();
          } catch (err) {
            toast(err.message || "Failed to create household.", "error");
          } finally {
            createBtn.disabled = false;
          }
        });

        const setupCard = el("div", { class: "rounded-2xl border border-slate-800 bg-slate-900/40 p-4 shadow-sm backdrop-blur-sm space-y-3" }, [
          el("h3", { class: "text-sm font-bold text-slate-200 tracking-wide" }, "Shared Space Setup"),
          el("p", { class: "text-xs text-slate-400 leading-relaxed font-medium" }, "Set up a shared space to synchronize storage locations and cataloged items with up to 3 family members."),
          el("div", { class: "space-y-2.5 pt-1.5" }, [
            nameInput,
            createBtn
          ])
        ]);

        householdContainer.replaceChildren(setupCard);
      }
    } catch (err) {
      console.error(err);
      householdContainer.replaceChildren(el("p", { class: "text-xs text-rose-400 py-4 font-semibold text-center" }, "Failed to read household config."));
    }
  };

  await refreshHouseholdSection();
  return container;
}
