import { useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

/** Runs a change on the server, then reloads the page's data. Errors become a toast. */
export function useAction() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  async function run<T>(work: () => Promise<T>): Promise<T | undefined> {
    setPending(true);
    try {
      const result = await work();
      await router.invalidate();
      return result;
    } catch (error) {
      toast.error(errorMessage(error));
      return undefined;
    } finally {
      setPending(false);
    }
  }
  return { run, pending };
}

export function errorMessage(error: unknown): string {
  return error instanceof Error && error.message ? error.message : "Something went wrong.";
}
