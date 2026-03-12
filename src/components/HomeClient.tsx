"use client";
import { useState, use, Suspense } from "react";
import ConsentScreen from "@/components/ConsentScreen";
import DrawingBoard from "@/components/DrawingBoard/DrawingBoard";

function BoardWithData({ promise }: { promise: Promise<{ fabricJSON: string }[]> }) {
  const initialObjects = use(promise);
  return <DrawingBoard initialObjects={initialObjects} />;
}

export default function HomeClient({
  initialEntered,
  objectsPromise,
}: {
  initialEntered: boolean;
  objectsPromise: Promise<{ fabricJSON: string }[]>;
}) {
  const [entered, setEntered] = useState(initialEntered);

  return (
    <>
      {!entered && <ConsentScreen onEnter={() => setEntered(true)} />}
      <Suspense
        fallback={
          // Canvas-coloured blank so the layout is stable while objects stream in
          <div className="fixed inset-0" style={{ background: "#F6F6F6" }} />
        }
      >
        <BoardWithData promise={objectsPromise} />
      </Suspense>
    </>
  );
}
