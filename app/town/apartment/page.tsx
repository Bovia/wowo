import { redirect } from "next/navigation";

export default function ApartmentEntrance() {
  redirect("/town?building=apartment");
}
