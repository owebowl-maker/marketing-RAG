import { redirect } from "next/navigation";
import AdminView from "@/components/AdminView";
import { currentUser, isAdmin } from "@/lib/auth";
import { listFeedback, listRecentQuestions } from "@/lib/db";
import { loadGlossary } from "@/lib/glossary";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (!isAdmin(user)) redirect("/");
  const { entries, isSample } = loadGlossary();
  return (
    <AdminView
      feedback={listFeedback()}
      questions={listRecentQuestions()}
      glossaryCount={entries.length}
      glossaryIsSample={isSample}
      backend={process.env.CHAT_BACKEND ?? "mock"}
    />
  );
}
