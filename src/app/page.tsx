import { cookies } from "next/headers";
import HomeClient from "@/components/HomeClient";

export default async function Home() {
  const cookieStore = await cookies();
  const initialEntered = cookieStore.get("crumb_consented")?.value === "true";

  return <HomeClient initialEntered={initialEntered} />;
}
