import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { useState } from "react";
import { rootReducer, type RootState } from "@client/store";
import {
  blueprintLoaded,
  selectAllScenarios,
  selectAllStories,
  selectAllTasks,
  selectEpicById,
} from "@client/store/slices/blueprintSlice";
import EpicCanvas from "@client/components/EpicCanvas";
import { sampleBlueprint } from "./fixtures";

/** Mounts the Matching epic (E1) with a real store; expansion state lives in a tiny host. */
function renderEpic(expanded: string | null = null) {
  const store = configureStore({ reducer: rootReducer });
  store.dispatch(blueprintLoaded(sampleBlueprint));

  function Host() {
    const [expandedStoryId, setExpanded] = useState<string | null>(expanded);
    const epic = selectEpicById(store.getState() as RootState, "E1")!;
    return <EpicCanvas activeEpic={epic} expandedStoryId={expandedStoryId} onSetExpandedStory={setExpanded} />;
  }

  render(
    <Provider store={store}>
      <Host />
    </Provider>,
  );
  const state = () => store.getState() as RootState;
  return { store, state };
}

/** Simulate editing a contentEditable field: type new text, then leave it. */
function editField(el: HTMLElement, text: string) {
  el.focus();
  el.textContent = text;
  fireEvent.blur(el);
}

/** The expanded story's card (E1 has two stories, so scope queries to one). */
const expandedCard = () => within(screen.getByRole("button", { expanded: true }).closest("li")!);

describe("inline editing", () => {
  it("marks every editable field with the shared affordance and a text cursor", () => {
    renderEpic("S1");
    const fields = screen.getAllByRole("textbox");
    expect(fields.length).toBeGreaterThan(8); // epic title/desc, story fields, criteria, gherkin, tasks
    for (const f of fields) expect(f).toHaveClass("editable");
    expect(screen.getByText(/click any text to edit/i)).toBeInTheDocument();
  });

  it("typing a space inside a story field does not collapse the story", async () => {
    const user = userEvent.setup();
    renderEpic("S1");

    const header = screen.getByRole("button", { expanded: true });
    const title = within(header).getByRole("textbox", { name: /story title/i });

    await user.click(title);
    await user.keyboard(" ");
    await user.keyboard("{Enter}");

    expect(screen.getByRole("button", { expanded: true })).toBeInTheDocument();
    // Task panel still visible.
    expect(screen.getByRole("textbox", { name: /given step/i })).toBeInTheDocument();
  });

  it("commits story, epic and acceptance-criterion edits to the store on blur", () => {
    const { state } = renderEpic("S1");

    const card = expandedCard();
    editField(screen.getByRole("textbox", { name: /epic title/i }), "Matching & Discovery");
    editField(card.getByRole("textbox", { name: /^as a$/i }), "dog owner");
    editField(card.getByRole("textbox", { name: /acceptance criterion 1/i }), "Shows dogs within 5 km");

    expect(selectEpicById(state(), "E1")!.title).toBe("Matching & Discovery");
    const s1 = selectAllStories(state()).find((s) => s.storyId === "S1")!;
    expect(s1.asA).toBe("dog owner");
    expect(s1.acceptanceCriteria).toEqual(["Shows dogs within 5 km"]);
  });

  it("edits Gherkin scenario steps and can add / delete scenarios", async () => {
    const user = userEvent.setup();
    const { state } = renderEpic("S1");

    editField(screen.getByRole("textbox", { name: /given step/i }), "I have a dog profile");
    editField(screen.getByRole("textbox", { name: /^feature$/i }), "Nearby matching");
    let g1 = selectAllScenarios(state()).find((g) => g.scenarioId === "G1")!;
    expect(g1).toMatchObject({ given: "I have a dog profile", feature: "Nearby matching" });

    await user.click(screen.getByRole("button", { name: /add scenario/i }));
    expect(selectAllScenarios(state()).filter((g) => g.storyId === "S1")).toHaveLength(2);

    await user.click(screen.getAllByRole("button", { name: /delete scenario/i })[0]);
    expect(selectAllScenarios(state()).filter((g) => g.storyId === "S1")).toHaveLength(1);
    g1 = selectAllScenarios(state()).find((g) => g.scenarioId === "G1")!;
    expect(g1).toBeUndefined();
  });

  it("edits task title, hours and priority, toggles completion, and can add / delete tasks", async () => {
    const user = userEvent.setup();
    const { state } = renderEpic("S1");
    const task = (id: string) => selectAllTasks(state()).find((t) => t.taskId === id)!;

    const card = expandedCard();
    const titles = card.getAllByRole("textbox", { name: /task title/i });
    editField(titles[0], "Radius search");
    expect(task("T1").title).toBe("Radius search");

    const hours = card.getAllByRole("textbox", { name: /estimated hours/i });
    editField(hours[0], "12.5");
    expect(task("T1").estimatedHours).toBe(12.5);
    editField(hours[0], "lots"); // rejected, value unchanged
    expect(task("T1").estimatedHours).toBe(12.5);

    // The story chip is also "High"; pick the one inside the T1 task row.
    const t1Row = titles[0].closest(".group\\/row")!;
    await user.click(within(t1Row as HTMLElement).getByRole("button", { name: /priority high, click to set medium/i }));
    expect(task("T1").priority).toBe("Medium");

    await user.click(screen.getByRole("button", { name: /mark "radius search" done/i }));
    expect(task("T1").completed).toBe(true);

    await user.click(screen.getByRole("button", { name: /add task/i }));
    expect(selectAllTasks(state()).filter((t) => t.storyId === "S1")).toHaveLength(3);

    await user.click(screen.getByRole("button", { name: /delete task "list ui"/i }));
    expect(task("T2")).toBeUndefined();
  });

  it("Escape reverts an in-progress edit and empty required fields are restored", () => {
    const { state } = renderEpic("S1");
    const title = screen.getByRole("textbox", { name: /epic title/i });

    title.focus();
    title.textContent = "Oops";
    fireEvent.keyDown(title, { key: "Escape" });
    fireEvent.blur(title);
    expect(selectEpicById(state(), "E1")!.title).toBe("Matching");
    expect(title.textContent).toBe("Matching");

    editField(title, "   ");
    expect(selectEpicById(state(), "E1")!.title).toBe("Matching");
    expect(title.textContent).toBe("Matching");
  });
});
