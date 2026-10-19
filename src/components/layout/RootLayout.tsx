import { Outlet } from "react-router-dom";
import { ChatBot } from "../../chatbot/ChatBot";
import { LocalGuideBot } from "../../chatbot/LocalGuideBot";

export function RootLayout() {
  return (
    <>
      <Outlet />
      <ChatBot />
      <LocalGuideBot />
    </>
  );
}
