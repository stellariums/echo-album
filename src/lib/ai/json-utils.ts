// Robust JSON extraction from LLM responses.
// Handles bare JSON, ```json fences, and JSON embedded in prose.

export function extractJson<T = unknown>(text: string): T {
  const trimmed = text.trim();

  // 1. Direct parse
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    // continue
  }

  // 2. Code fence
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) {
    try {
      return JSON.parse(fence[1]) as T;
    } catch {
      // continue
    }
  }

  // 3. First { ... } or [ ... ] block, greedy to last closing brace
  const obj = trimmed.match(/\{[\s\S]*\}/);
  if (obj) {
    try {
      return JSON.parse(obj[0]) as T;
    } catch {
      // continue
    }
  }
  const arr = trimmed.match(/\[[\s\S]*\]/);
  if (arr) {
    try {
      return JSON.parse(arr[0]) as T;
    } catch {
      // continue
    }
  }

  throw new Error(
    "Could not extract JSON from model response: " + trimmed.slice(0, 300)
  );
}
