"use client";

import { useParams } from "next/navigation";
import PriorityDetailView from "@/components/priorities/PriorityDetailView";

export default function OfficialPriorityDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  return <PriorityDetailView clusterId={id} mode="official" />;
}
