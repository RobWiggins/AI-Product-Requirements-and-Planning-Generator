import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import blueprintReducer from "./slices/blueprintSlice";
import projectsReducer from "./slices/projectsSlice";

export const rootReducer = {
  auth: authReducer,
  projects: projectsReducer,
  blueprint: blueprintReducer,
};

export const store = configureStore({ reducer: rootReducer });

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
