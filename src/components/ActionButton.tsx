import Link from "next/link";
import { ReactNode } from "react";

type ActionButtonVariant = "blue" | "green" | "red" | "yellow";

interface ActionButtonProps {
  href?: string;
  onClick?: (e: React.MouseEvent) => void;
  variant?: ActionButtonVariant;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

const variantStyles: Record<ActionButtonVariant, string> = {
  blue: "bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-600",
  green: "bg-green-50 hover:bg-green-100 border-green-200 text-green-600",
  red: "bg-red-50 hover:bg-red-100 border-red-200 text-red-600",
  yellow: "bg-yellow-50 hover:bg-yellow-100 border-yellow-200 text-yellow-600",
};

export default function ActionButton({
  href,
  onClick,
  variant = "blue",
  icon,
  children,
  className,
}: ActionButtonProps) {
  const buttonClassName = `inline-flex items-center gap-1 px-3 py-1 border rounded font-medium text-xs transition-colors ${variantStyles[variant]} ${className || ""}`;

  const content = (
    <>
      {icon}
      {children}
    </>
  );

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick?.(e);
  };

  if (href) {
    return (
      <Link href={href} className={buttonClassName} onClick={handleClick}>
        {content}
      </Link>
    );
  }

  return (
    <button onClick={handleClick} className={buttonClassName}>
      {content}
    </button>
  );
}
