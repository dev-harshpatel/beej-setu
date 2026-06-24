import { useLoaderStore } from "@/store/loader.store";

/**
 * App-wide loading overlay. Call `withLoader` inside any button handler to
 * show the loader for the duration of an async action — it shows on call
 * and hides on success or failure, even if the action throws.
 */
export function useGlobalLoader() {
  const show = useLoaderStore((s) => s.show);
  const hide = useLoaderStore((s) => s.hide);

  async function withLoader<T>(action: () => Promise<T>, message?: string): Promise<T> {
    show(message);
    try {
      return await action();
    } finally {
      hide();
    }
  }

  return { show, hide, withLoader };
}
