import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import App from "@client/App";
import itemsReducer from "@client/store/slices/exampleSlice";

function renderWithStore(ui: React.ReactElement) {
  const store = configureStore({ reducer: { items: itemsReducer } });
  return render(<Provider store={store}>{ui}</Provider>);
}

describe("App", () => {
  it("renders the heading", () => {
    renderWithStore(<App />);
    expect(
      screen.getByRole("heading", { name: /AI Product Requirements Generator/i })
    ).toBeInTheDocument();
  });

  it("shows loading state initially", () => {
    renderWithStore(<App />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });
});
