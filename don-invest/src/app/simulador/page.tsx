import { Planner } from "@/components/planner/Planner";

export const metadata = { title: "Simulador — DON INVEST" };

export default function Simulador() {
  return <Planner withResearch={false} />;
}
