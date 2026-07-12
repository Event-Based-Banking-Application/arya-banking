import { getDocsTree } from "@/lib/content";
import Sidebar from "@/components/Sidebar";

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const tree = getDocsTree();

  return (
    <div className="flex max-w-7xl mx-auto">
      <Sidebar tree={tree} />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
