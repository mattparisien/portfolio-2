"use client";
import DrawingBoard from "@/components/DrawingBoard/DrawingBoard";
import { Suspense, use } from "react";

function BoardWithData({ promise }: { promise: Promise<{ fabricJSON: string }[]> }) {
  const initialObjects = use(promise);
  return <DrawingBoard initialObjects={initialObjects} />;
}

export default function HomeClient({
    objectsPromise,
}: {
  objectsPromise: Promise<{ fabricJSON: string }[]>;
}) {

  return (
    <>
      <Suspense
        fallback={
          // Canvas-coloured blank so the layout is stable while objects stream in
          <div className="fixed inset-0 w-screen h-screen bg-canvas-bg" />
        }
      >
        <BoardWithData promise={objectsPromise} />
      </Suspense>
    </>
  );
}
