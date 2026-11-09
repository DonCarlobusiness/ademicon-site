import { getReport } from "@/lib/store";
import { ReportLoader } from "@/components/ReportLoader";

export const dynamic = "force-dynamic";
export const metadata = { title: "Relatório de pesquisa — DON INVEST" };

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const serverReport = await getReport(id).catch(() => null);
  return <ReportLoader id={id} serverReport={serverReport} />;
}
