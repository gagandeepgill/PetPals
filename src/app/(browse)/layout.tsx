import { SiteHeader } from "@/components/site-header";

export default function BrowseLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main>{children}</main>
    </>
  );
}
