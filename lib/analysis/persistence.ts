import { getSupabaseServerClient } from "@/lib/integrations/supabase";
import type { AnalysisInput, AnalysisResult } from "@/types";

const ANALYSIS_TABLE = "rental_analyses";

interface PersistAnalysisParams {
  result: AnalysisResult;
  input: AnalysisInput;
  trace: {
    toolName: string;
    status: "completed" | "skipped" | "failed";
    detail: string;
  }[];
}

export async function persistAnalysisResult({
  result,
  input,
  trace,
}: PersistAnalysisParams): Promise<{ persisted: boolean; detail: string }> {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return {
      persisted: false,
      detail: "Supabase server credentials are not configured, so analysis persistence was skipped.",
    };
  }

  try {
    const { error } = await supabase.from(ANALYSIS_TABLE).upsert(
      {
        id: result.id,
        score: result.score,
        label: result.label,
        model_id: result.modelIdUsed,
        created_at: result.createdAt,
        input_payload: input,
        result_payload: result,
        trace_payload: trace,
      },
      {
        onConflict: "id",
      },
    );

    if (error) {
      return {
        persisted: false,
        detail: `Supabase persistence was skipped: ${error.message}`,
      };
    }

    return {
      persisted: true,
      detail: "Analysis result was persisted to Supabase.",
    };
  } catch (error) {
    return {
      persisted: false,
      detail:
        error instanceof Error
          ? `Supabase persistence failed: ${error.message}`
          : "Supabase persistence failed for an unknown reason.",
    };
  }
}

export async function getPersistedAnalysisResult(id: string): Promise<AnalysisResult | null> {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from(ANALYSIS_TABLE)
      .select("result_payload")
      .eq("id", id)
      .maybeSingle();

    if (error || !data?.result_payload) {
      return null;
    }

    return data.result_payload as AnalysisResult;
  } catch {
    return null;
  }
}
