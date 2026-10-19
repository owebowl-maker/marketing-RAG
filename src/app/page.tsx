import { redirect } from "next/navigation";
import ChatApp from "@/components/ChatApp";
import { currentUser, isAdmin } from "@/lib/auth";

export default async function Home() {
  const user = await currentUser();
  if (!user) redirect("/login");
  return <ChatApp user={user} isAdmin={isAdmin(user)} />;
}
