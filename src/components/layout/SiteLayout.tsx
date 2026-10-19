import { Outlet } from "react-router-dom";
import { AnnouncementBar } from "./AnnouncementBar";
import { Footer } from "./Footer";
import { Navbar } from "./Navbar";

export function SiteLayout() {
  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <main id="main-content">
        <Outlet />
      </main>
      <Footer />
    </>
  );
}
