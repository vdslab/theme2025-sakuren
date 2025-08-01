import type { FC } from "react";

type Props = {
  value: string;
  mousePos: { x: number; y: number };
};

export const HoveredTooltip: FC<Props> = ({ value, mousePos }) => {
  return (
    <div
      className="hovered-tooltip"
      style={{
        position: "fixed",
        top: mousePos.y,
        left: mousePos.x,
        background: "rgba(0,0,0,0.75)",
        color: "white",
        padding: "4px 8px",
        borderRadius: "4px",
        fontSize: "12px",
        pointerEvents: "none",
        whiteSpace: "nowrap",
        zIndex: 1000, // Ensure the tooltip is above other elements
      }}
    >
      <span>{value}</span>
    </div>
  );
};
