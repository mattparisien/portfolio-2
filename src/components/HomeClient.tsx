"use client";
import EditorCanvas from "@/components/Editor/Canvas";
import EditorHeader from "@/components/Editor/Header";

import { Suspense, use } from "react";

function CanvasWithData({ promise }: { promise: Promise<{ fabricJSON: string }[]> }) {
  const initialObjects = use(promise);
  return <EditorCanvas initialObjects={initialObjects} />;
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
          <div className="fixed inset-0" style={{ background: "#F6F6F6" }} />
        }
      >
        <EditorHeader isSyncing={false} />
        <CanvasWithData promise={objectsPromise} />
      </Suspense>
    </>
  );
}
