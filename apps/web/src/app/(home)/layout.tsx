import { HomeLayout } from "fumadocs-ui/layouts/home";
import { baseOptions } from "@/lib/layout.shared";

export default function Layout({ children }: LayoutProps<"/">) {
  const base = baseOptions();
  return (
    <div className="home-shell [--fd-layout-width:72rem]">
      <HomeLayout {...base} nav={{ ...base.nav, transparentMode: "none" }}>
        {children}
      </HomeLayout>
    </div>
  );
}
