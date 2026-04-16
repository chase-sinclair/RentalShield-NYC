import { ErrorState } from "@/components/error-state";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <ErrorState
        title="Result not found"
        description="That analysis result does not exist in the scaffold. Try the sample mock result or run a new analysis flow."
      />
    </div>
  );
}
