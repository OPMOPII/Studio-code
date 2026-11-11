type InsertHandler = (code: string) => void;

let handler: InsertHandler | null = null;

export const editorBus = {
  register(fn: InsertHandler | null) {
    handler = fn;
  },
  insert(code: string) {
    handler?.(code);
  },
};
