import { test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ToolCallBadge, getToolCallLabel } from "../ToolCallBadge";

// --- getToolCallLabel ---

test("getToolCallLabel: str_replace_editor create", () => {
  expect(getToolCallLabel("str_replace_editor", { command: "create", path: "src/components/Button.jsx" })).toBe("Creating Button.jsx");
});

test("getToolCallLabel: str_replace_editor str_replace", () => {
  expect(getToolCallLabel("str_replace_editor", { command: "str_replace", path: "src/App.jsx" })).toBe("Editing App.jsx");
});

test("getToolCallLabel: str_replace_editor insert", () => {
  expect(getToolCallLabel("str_replace_editor", { command: "insert", path: "src/App.jsx" })).toBe("Editing App.jsx");
});

test("getToolCallLabel: str_replace_editor view", () => {
  expect(getToolCallLabel("str_replace_editor", { command: "view", path: "src/index.js" })).toBe("Reading index.js");
});

test("getToolCallLabel: str_replace_editor undo_edit", () => {
  expect(getToolCallLabel("str_replace_editor", { command: "undo_edit", path: "src/App.jsx" })).toBe("Undoing edit in App.jsx");
});

test("getToolCallLabel: file_manager rename", () => {
  expect(getToolCallLabel("file_manager", { command: "rename", path: "src/Old.jsx", new_path: "src/New.jsx" })).toBe("Renaming Old.jsx");
});

test("getToolCallLabel: file_manager delete", () => {
  expect(getToolCallLabel("file_manager", { command: "delete", path: "src/Unused.jsx" })).toBe("Deleting Unused.jsx");
});

test("getToolCallLabel: falls back to toolName for unknown tools", () => {
  expect(getToolCallLabel("some_other_tool", { command: "foo" })).toBe("some_other_tool");
});

test("getToolCallLabel: handles missing path gracefully", () => {
  expect(getToolCallLabel("str_replace_editor", { command: "create" })).toBe("Creating file");
  expect(getToolCallLabel("str_replace_editor", { command: "str_replace" })).toBe("Editing file");
  expect(getToolCallLabel("file_manager", { command: "delete" })).toBe("Deleting file");
});

test("getToolCallLabel: handles nested path correctly", () => {
  expect(getToolCallLabel("str_replace_editor", { command: "create", path: "src/components/ui/Card.tsx" })).toBe("Creating Card.tsx");
});

// --- ToolCallBadge component ---

test("ToolCallBadge renders friendly label and green dot when done", () => {
  render(
    <ToolCallBadge
      toolName="str_replace_editor"
      args={{ command: "create", path: "src/Button.jsx" }}
      state="result"
    />
  );

  expect(screen.getByText("Creating Button.jsx")).toBeDefined();
  // Green dot present (no spinner)
  expect(screen.queryByRole("img")).toBeNull();
});

test("ToolCallBadge renders friendly label with spinner when in progress", () => {
  const { container } = render(
    <ToolCallBadge
      toolName="str_replace_editor"
      args={{ command: "str_replace", path: "src/App.jsx" }}
      state="call"
    />
  );

  expect(screen.getByText("Editing App.jsx")).toBeDefined();
  // Spinner present
  expect(container.querySelector(".animate-spin")).toBeDefined();
});

test("ToolCallBadge renders file_manager delete label", () => {
  render(
    <ToolCallBadge
      toolName="file_manager"
      args={{ command: "delete", path: "src/OldComponent.jsx" }}
      state="result"
    />
  );

  expect(screen.getByText("Deleting OldComponent.jsx")).toBeDefined();
});

test("ToolCallBadge falls back to toolName for unknown tool", () => {
  render(
    <ToolCallBadge
      toolName="unknown_tool"
      args={{}}
      state="result"
    />
  );

  expect(screen.getByText("unknown_tool")).toBeDefined();
});
