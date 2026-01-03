import Link from "next/link";

export default function HomeButton() {
  return (
    <div className="mb-4">
      <Link
        href="/"
        className="inline-flex items-center gap-2 bg-gray-50 hover:bg-gray-100 px-3 py-2 border border-gray-300 rounded-lg font-medium text-gray-600 text-sm transition-colors"
      >
        ← Home
      </Link>
    </div>
  );
}
