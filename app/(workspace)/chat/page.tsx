import { connection } from "next/server";
import { ChatPanel } from "@/components/chat-panel";

export const metadata = { title: "Ask" };
export const instant = false;

export default async function ChatPage() {
  await connection();
  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[0.2em] text-gold">Ask</p>
        <h1 className="font-serif text-4xl tracking-tight">Question the library</h1>
      </header>
      <ChatPanel />
    </div>
  );
}
