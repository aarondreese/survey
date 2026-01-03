import Link from "next/link";
import { PlusIcon } from "./icons";

interface CreateButtonProps {
  href?: string;
  onClick?: () => void;
  children: React.ReactNode;
}

export default function CreateButton({
  href,
  onClick,
  children,
}: CreateButtonProps) {
  const className =
    "flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-medium text-white transition-colors";

  const content = (
    <>
      <PlusIcon />
      {children}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button onClick={onClick} className={className}>
      {content}
    </button>
  );
}
