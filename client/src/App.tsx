import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "./hooks";
import { fetchItems } from "./store/slices/exampleSlice";

function App() {
  const dispatch = useAppDispatch();
  const { items, status, error } = useAppSelector((state) => state.items);

  useEffect(() => {
    if (status === "idle") dispatch(fetchItems());
  }, [status, dispatch]);

  return (
    <main>
      <h1>AI Product Requirements Generator</h1>
      {status === "loading" && <p>Loading...</p>}
      {status === "failed" && <p>Error: {error}</p>}
      <ul>
        {items.map((item) => (
          <li key={item.id}>{item.name}</li>
        ))}
      </ul>
    </main>
  );
}

export default App;
