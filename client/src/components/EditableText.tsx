import {
  createElement,
  useLayoutEffect,
  useRef,
  type ClipboardEvent,
  type CSSProperties,
  type KeyboardEvent,
  type SyntheticEvent,
} from "react";

interface Props {
  value: string;
  /** Called on blur / Enter when the text actually changed. */
  onCommit: (next: string) => void;
  /** Element to render — keeps the surrounding typography intact. */
  as?: "span" | "p" | "h2" | "h3" | "h4" | "div";
  /** Allow Enter to insert newlines (Shift+Enter always does). */
  multiline?: boolean;
  /** Shown (italic, muted) when the field is empty. */
  placeholder?: string;
  /** Revert to the previous value instead of committing an empty string. */
  required?: boolean;
  className?: string;
  style?: CSSProperties;
  "aria-label"?: string;
}

const read = (el: HTMLElement) => (el.innerText ?? el.textContent ?? "").replace(/\u00a0/g, " ").replace(/\n+$/, "");

/**
 * The one way text is edited in the blueprint editor.
 *
 * - Inline: renders as the given element so headings stay headings.
 * - Discoverable: `.editable` gives a text cursor, hover wash and focus ring.
 * - Plain text only: pastes are flattened, no rich formatting sneaks in.
 * - Predictable keys: Enter commits (unless `multiline`), Escape reverts.
 * - Self-contained: key and pointer events do not bubble, so typing a space
 *   inside a collapsible card never toggles the card, and selecting text
 *   never starts a drag.
 */
export function EditableText({
  value,
  onCommit,
  as = "span",
  multiline = false,
  placeholder,
  required = false,
  className = "",
  style,
  "aria-label": ariaLabel,
}: Props) {
  const ref = useRef<HTMLElement>(null);
  const latest = useRef(value);
  const cancelled = useRef(false);
  latest.current = value;

  // Keep the DOM in sync with the prop, but never clobber text the user is typing.
  useLayoutEffect(() => {
    const el = ref.current;
    if (el && document.activeElement !== el && read(el) !== value) el.textContent = value;
  }, [value]);

  const stop = (e: SyntheticEvent) => e.stopPropagation();

  const finish = () => {
    const el = ref.current;
    if (!el) return;
    const next = read(el);
    const wasCancelled = cancelled.current;
    cancelled.current = false;

    if (wasCancelled || next === latest.current || (required && next.trim() === "")) {
      el.textContent = latest.current;
      return;
    }
    onCommit(next);
    // If the parent rejected the value (prop unchanged), snap the DOM back after the re-render.
    requestAnimationFrame(() => {
      const node = ref.current;
      if (node && document.activeElement !== node && read(node) !== latest.current) node.textContent = latest.current;
    });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    e.stopPropagation();
    if (e.key === "Escape") {
      e.preventDefault();
      cancelled.current = true;
      ref.current?.blur();
    } else if (e.key === "Enter" && !e.shiftKey && !multiline) {
      e.preventDefault();
      ref.current?.blur();
    }
  };

  const onPaste = (e: ClipboardEvent<HTMLElement>) => {
    // Flatten to plain text even where `plaintext-only` isn't supported.
    e.preventDefault();
    document.execCommand("insertText", false, e.clipboardData.getData("text/plain"));
  };

  return createElement(as, {
    ref,
    contentEditable: "plaintext-only",
    suppressContentEditableWarning: true,
    role: "textbox",
    "aria-multiline": multiline || undefined,
    "aria-label": ariaLabel,
    "data-placeholder": placeholder,
    spellCheck: true,
    className: `editable ${multiline ? "whitespace-pre-wrap" : ""} ${className}`.trim(),
    style,
    onBlur: finish,
    onKeyDown,
    onKeyUp: stop,
    onKeyPress: stop,
    onClick: stop,
    onMouseDown: stop,
    onPointerDown: stop,
    onPaste,
  });
}

export default EditableText;
