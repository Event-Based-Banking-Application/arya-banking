import { getDocsTree } from "@/lib/content";
import Sidebar from "@/components/Sidebar";

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const tree = getDocsTree();

  return (
    <>
      <Sidebar tree={tree} />
      <div className="lg:pl-64 xl:pr-56">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </div>
    </>
  );
}
