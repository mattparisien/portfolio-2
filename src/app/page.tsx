import HomeClient from "@/components/HomeClient";
import dbConnect from "@/lib/mongodb";
import FabricObject from "@/models/FabricObject";

export const dynamic = "force-dynamic";

async function getBoardObjects(): Promise<{ fabricJSON: string }[]> {
  await dbConnect();
  const docs = await FabricObject.find({ boardId: "main" })
    .sort({ createdAt: 1 })
    .limit(2000)
    .lean();
  return docs.map((d) => ({ fabricJSON: d.fabricJSON as string }));
}

export default async function Home() {

  // Start the fetch but don't await — React 19 streams the resolved value
  // to the client once ready, while the page shell renders immediately.
  const objectsPromise = getBoardObjects();

  return <HomeClient objectsPromise={objectsPromise} />;
}
