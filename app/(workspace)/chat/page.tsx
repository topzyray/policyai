import { connection } from "next/server";
import { ChatPanel } from "@/components/chat-panel";
import { PageHeader } from "@/components/page-header";

export const metadata = { title: "Ask" };
export const instant = false;

export default async function ChatPage() {
  await connection();
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Ask"
        title="Question the library"
        description="Answers use only the excerpts Auth0 FGA allows. Withheld documents are counted, not quoted."
      />
      <ChatPanel />
    </div>
  );
}
