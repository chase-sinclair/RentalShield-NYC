"use client";

import { ErrorState } from "@/components/error-state";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  console.error(error);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <ErrorState
        title="Something went wrong"
        description="The baseline scaffold hit an unexpected error. Once the APIs are wired, this boundary can include more targeted recovery actions."
      />
    </div>
  );
}
