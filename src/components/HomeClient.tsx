"use client";
import { useState } from "react";
import ConsentScreen from "@/components/ConsentScreen";
import DrawingBoard from "@/components/DrawingBoard/DrawingBoard";

export default function HomeClient({ initialEntered }: { initialEntered: boolean }) {
  const [entered, setEntered] = useState(initialEntered);

  return <>
    {!entered && <ConsentScreen onEnter={() => setEntered(true)} />}
    <DrawingBoard />
  </>;
}
