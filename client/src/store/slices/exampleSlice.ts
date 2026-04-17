import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";

export interface Item {
  id: number;
  name: string;
  created_at: string;
}

interface ItemsState {
  items: Item[];
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
}

const initialState: ItemsState = {
  items: [],
  status: "idle",
  error: null,
};

export const fetchItems = createAsyncThunk("items/fetchAll", async () => {
  const res = await fetch("/api/items");
  if (!res.ok) throw new Error("Failed to fetch items");
  return (await res.json()) as Item[];
});

export const itemsSlice = createSlice({
  name: "items",
  initialState,
  reducers: {
    addItem(state, action: PayloadAction<Item>) {
      state.items.push(action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchItems.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchItems.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload;
      })
      .addCase(fetchItems.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message ?? "Unknown error";
      });
  },
});

export const { addItem } = itemsSlice.actions;
export default itemsSlice.reducer;
