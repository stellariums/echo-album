import { redirect } from "next/navigation";

// /search now lives on /memories (browse + search merged into one).
// Kept as a permanent redirect for any old bookmarks / external links.
export default function SearchPage() {
  redirect("/memories");
}
