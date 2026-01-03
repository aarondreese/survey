import { ReactNode } from "react";

interface ListCardProps {
  isSelected?: boolean;
  onClick?: () => void;
  children: ReactNode;
}

export default function ListCard({
  isSelected,
  onClick,
  children,
}: ListCardProps) {
  return (
    <div
      className={`p-3 border rounded hover:bg-gray-50 transition-colors ${
        isSelected ? "border-blue-500 bg-blue-50" : "border-gray-200"
      } ${onClick ? "cursor-pointer" : ""}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
