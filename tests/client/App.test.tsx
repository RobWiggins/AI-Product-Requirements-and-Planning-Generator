import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import App from "@client/App";
import { store } from "@client/store";

function renderApp() {
  return render(
    <Provider store={store}>
      <App />
    </Provider>
  );
}

describe("App", () => {
  it("renders the StoryFlow landing page", () => {
    renderApp();

    expect(screen.getByText("StoryFlow")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /a single paragraph/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /draft my plan/i })).toBeDisabled();
    expect(screen.getByText(/^ready$/i)).toBeInTheDocument();
  });

  it("enables drafting after an example is selected", async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole("button", { name: /try an example/i }));

    expect(screen.getByRole("textbox")).toHaveValue(
      "An app that helps dog owners find safe, trusted playdates for their dogs nearby."
    );
    expect(screen.getByRole("button", { name: /draft my plan/i })).toBeEnabled();
  });
});
