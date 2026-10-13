import type { Metadata } from "next";
import { MyDayView } from "@/components/my-day/my-day-view";

export const metadata: Metadata = { title: "My Day" };

export default function MyDayPage() {
  return <MyDayView />;
}
