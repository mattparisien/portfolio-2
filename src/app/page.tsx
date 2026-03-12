"use client";
import { useState } from "react";
import ConsentScreen from "@/components/ConsentScreen";
import DrawingBoard from "@/components/DrawingBoard/DrawingBoard";

export default function Home() {
  const [entered, setEntered] = useState(false);
  return <>
    {!entered && <ConsentScreen onEnter={() => setEntered(true)} />}
    <DrawingBoard />
  </>;
}
