import React, { useMemo } from "react";
import SuperGridRow from "./SuperGridRow";
import SuperGridItem from "./SuperGridItem";
import config from "./config";

interface SuperGridSectionProps {
  items: { url: string }[];
  addToRefArray: (node: HTMLDivElement | null) => void;
}

function SuperGridSection({ items, addToRefArray  }: SuperGridSectionProps) {
  const rows = useMemo(() => {
    if (items) {
      return items.map((item: { url: string }, idx: number) => {
        const configItem = config[idx + 1];
        return (
        <SuperGridRow
          key={idx}
          justify={`justify-${idx % 2 === 0 ? "start" : "end"}`}
        >
          <SuperGridItem
            image={item}
            addToRefArray={addToRefArray}
            width={configItem?.width || ""}
            margin={configItem?.margin || ""}
            offset={configItem?.offset || ""}
            speed={configItem?.speed || 1}
          />
        </SuperGridRow>
      );});
    }
  }, [items, addToRefArray]);

  return <div className="SuperGridSection flex flex-col">{rows}</div>;
}

export default SuperGridSection;
