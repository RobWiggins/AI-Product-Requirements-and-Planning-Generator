import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import App from "@client/App";
import { rootReducer } from "@client/store";

/**
 * jsdom has no `fetch`; stand in for the API with a tiny router keyed on
 * `METHOD /path`. `me` is the user a session cookie would resolve to.
 */
type Reply = { status: number; body?: unknown };
type Route = (body: unknown) => Reply | Promise<Reply>;

const guest = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Guest",
  email: null,
  avatarUrl: null,
  isGuest: true,
  providers: [] as string[],
};

function mockApi(overrides: Record<string, Route> = {}) {
  const routes: Record<string, Route> = {
    "GET /api/auth/providers": () => ({ status: 200, body: { guest: true, google: false, github: true } }),
    "GET /api/auth/me": () => ({ status: 401, body: { error: "Authentication required" } }),
    "POST /api/auth/guest": () => ({ status: 201, body: { user: guest } }),
    "POST /api/auth/logout": () => ({ status: 204 }),
    "GET /api/projects": () => ({ status: 200, body: [] }),
    ...overrides,
  };

  // jsdom has no Response class either; `api()` only reads these four members.
  const reply = (status: number, body?: unknown) => ({
    status,
    ok: status >= 200 && status < 300,
    statusText: String(status),
    json: async () => {
      if (body === undefined) throw new Error("no body");
      return body;
    },
  });

  const calls: string[] = [];
  const fetchMock = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const key = `${(init?.method ?? "GET").toUpperCase()} ${url.split("?")[0]}`;
    calls.push(key);
    const route = routes[key];
    if (!route) return reply(404, { error: `Unmocked ${key}` });
    const { status, body } = await route(init?.body ? JSON.parse(init.body as string) : undefined);
    return reply(status, body);
  });
  global.fetch = fetchMock as unknown as typeof fetch;
  return { calls, fetchMock };
}

function renderApp() {
  const store = configureStore({ reducer: rootReducer });
  return render(
    <Provider store={store}>
      <App />
    </Provider>,
  );
}

describe("App", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("shows the three ways to continue when there is no session", async () => {
    mockApi();
    renderApp();

    expect(await screen.findByRole("heading", { name: /choose how to continue/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /continue as guest/i })).toBeEnabled();
    // Only GitHub is configured in the mock; Google is present but disabled.
    expect(screen.getByRole("button", { name: /continue with google/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /continue with github/i })).toBeEnabled();
    expect(screen.getByRole("heading", { name: /a single paragraph/i })).toBeInTheDocument();
  });

  it("continues as guest into the workspace and loads that user's projects", async () => {
    const user = userEvent.setup();
    const { calls } = mockApi();
    renderApp();

    await user.click(await screen.findByRole("button", { name: /continue as guest/i }));

    expect(await screen.findByRole("button", { name: /draft my plan/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /account menu/i })).toHaveTextContent(/guest/i);
    expect(screen.getByText(/^ready$/i)).toBeInTheDocument();
    await waitFor(() => expect(calls).toContain("GET /api/projects"));
  });

  it("restores an existing session and lists saved plans", async () => {
    mockApi({
      "GET /api/auth/me": () => ({ status: 200, body: { user: { ...guest, name: "Rob", isGuest: false, providers: ["github"] } } }),
      "GET /api/projects": () => ({
        status: 200,
        body: [
          {
            id: "22222222-2222-4222-8222-222222222222",
            projectName: "Dog Playdates",
            description: "Safe playdates for dogs nearby.",
            version: "0.1.0",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            epicCount: 2,
            storyCount: 5,
            taskCount: 8,
            completedTaskCount: 3,
          },
        ],
      }),
    });
    renderApp();

    expect(await screen.findByRole("button", { name: /open dog playdates/i })).toBeInTheDocument();
    expect(screen.getByText(/3\/8 tasks/i)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /choose how to continue/i })).not.toBeInTheDocument();
  });

  it("enables drafting after an example is selected", async () => {
    const user = userEvent.setup();
    mockApi({ "GET /api/auth/me": () => ({ status: 200, body: { user: guest } }) });
    renderApp();

    await user.click(await screen.findByRole("button", { name: /try an example/i }));

    expect(screen.getByRole("textbox")).toHaveValue(
      "An app that helps dog owners find safe, trusted playdates for their dogs nearby.",
    );
    expect(screen.getByRole("button", { name: /draft my plan/i })).toBeEnabled();
  });

  it("shows the drafting overlay while a plan is being generated", async () => {
    const user = userEvent.setup();
    mockApi({
      "GET /api/auth/me": () => ({ status: 200, body: { user: guest } }),
      // Never resolves: keeps the request in flight for the duration of the test.
      "POST /api/search": () => new Promise<Reply>(() => {}),
    });
    renderApp();

    await user.click(await screen.findByRole("button", { name: /try an example/i }));
    expect(screen.queryByRole("status", { name: /drafting your plan/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /draft my plan/i }));

    const overlay = await screen.findByRole("status", { name: /drafting your plan/i });
    expect(overlay).toHaveTextContent(/turning your paragraph into/i);
    expect(overlay).toHaveTextContent(/reading your brief/i);
    // The brief is echoed back so the user sees what's in flight.
    expect(overlay).toHaveTextContent(/dog owners find safe, trusted playdates/i);
    expect(screen.getByRole("button", { name: /drafting/i })).toBeDisabled();
  });

  it("signs out back to the login screen", async () => {
    const user = userEvent.setup();
    const { calls } = mockApi({ "GET /api/auth/me": () => ({ status: 200, body: { user: guest } }) });
    renderApp();

    await user.click(await screen.findByRole("button", { name: /account menu/i }));
    await user.click(screen.getByRole("menuitem", { name: /sign out/i }));

    expect(await screen.findByRole("heading", { name: /choose how to continue/i })).toBeInTheDocument();
    expect(calls).toContain("POST /api/auth/logout");
  });
});
