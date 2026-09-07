import Link from "next/link";

export default function Home() {
  return (
    <div className="p-8 pb-20 min-h-screen font-sans">
      <main className="mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <h1 className="mb-4 font-bold text-4xl">Dynamic Surveys</h1>
          <p className="text-gray-600 text-lg">
            Manage your surveys and question sets
          </p>
        </div>

        {/* Navigation Cards */}
        <div className="gap-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 mb-12">
          <Link href="/survey-generator" className="group">
            <div className="bg-white shadow-md hover:shadow-lg p-6 border border-gray-200 group-hover:border-indigo-300 rounded-lg transition-shadow">
              <div className="flex items-center mb-4">
                <div className="flex justify-center items-center bg-indigo-100 mr-4 rounded-lg w-12 h-12">
                  <svg
                    className="w-6 h-6 text-indigo-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 text-lg">
                    Generate New Survey
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Generate survey from stored procedure
                  </p>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/survey-instances" className="group">
            <div className="bg-white shadow-md hover:shadow-lg p-6 border border-gray-200 group-hover:border-teal-300 rounded-lg transition-shadow">
              <div className="flex items-center mb-4">
                <div className="flex justify-center items-center bg-teal-100 mr-4 rounded-lg w-12 h-12">
                  <svg
                    className="w-6 h-6 text-teal-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 group-hover:text-teal-600 text-lg">
                    Complete Survey
                  </h3>
                  <p className="text-gray-600 text-sm">
                    View and complete saved survey instances
                  </p>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/surveys" className="group">
            <div className="bg-white shadow-md hover:shadow-lg p-6 border border-gray-200 group-hover:border-orange-300 rounded-lg transition-shadow">
              <div className="flex items-center mb-4">
                <div className="flex justify-center items-center bg-orange-100 mr-4 rounded-lg w-12 h-12">
                  <svg
                    className="w-6 h-6 text-orange-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 group-hover:text-orange-600 text-lg">
                    Survey Templates
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Manage survey templates and configurations
                  </p>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/questionsets" className="group">
            <div className="bg-white shadow-md hover:shadow-lg p-6 border border-gray-200 group-hover:border-green-300 rounded-lg transition-shadow">
              <div className="flex items-center mb-4">
                <div className="flex justify-center items-center bg-green-100 mr-4 rounded-lg w-12 h-12">
                  <svg
                    className="w-6 h-6 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 group-hover:text-green-600 text-lg">
                    Question Sets
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Manage question sets and their questions
                  </p>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/meta-questions" className="group">
            <div className="bg-white shadow-md hover:shadow-lg p-6 border border-gray-200 group-hover:border-purple-300 rounded-lg transition-shadow">
              <div className="flex items-center mb-4">
                <div className="flex justify-center items-center bg-purple-100 mr-4 rounded-lg w-12 h-12">
                  <svg
                    className="w-6 h-6 text-purple-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 group-hover:text-purple-600 text-lg">
                    Meta-Questions
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Conditional questions that trigger question sets
                  </p>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/survey-rules" className="group">
            <div className="bg-white shadow-md hover:shadow-lg p-6 border border-gray-200 group-hover:border-red-300 rounded-lg transition-shadow">
              <div className="flex items-center mb-4">
                <div className="flex justify-center items-center bg-red-100 mr-4 rounded-lg w-12 h-12">
                  <svg
                    className="w-6 h-6 text-red-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 group-hover:text-red-600 text-lg">
                    Survey Rules
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Manage validation and business rules
                  </p>
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* Developer Tools */}
        <div className="mt-8">
          <h2 className="mb-4 font-semibold text-gray-700 text-lg">
            Developer Tools
          </h2>
          <div className="gap-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            <Link href="/api/survey" className="group">
              <div className="bg-gray-50 shadow hover:shadow-md p-4 border border-gray-200 group-hover:border-gray-300 rounded-lg transition-shadow">
                <div className="flex items-center">
                  <div className="flex justify-center items-center bg-gray-200 mr-3 rounded-lg w-10 h-10">
                    <svg
                      className="w-5 h-5 text-gray-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 text-sm">
                      Survey API
                    </h3>
                    <p className="text-gray-600 text-xs">
                      View JSON definition
                    </p>
                  </div>
                </div>
              </div>
            </Link>

            <Link href="/scratch2" className="group">
              <div className="bg-gray-50 shadow hover:shadow-md p-4 border border-gray-200 group-hover:border-gray-300 rounded-lg transition-shadow">
                <div className="flex items-center">
                  <div className="flex justify-center items-center bg-gray-200 mr-3 rounded-lg w-10 h-10">
                    <svg
                      className="w-5 h-5 text-gray-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 text-sm">
                      Scratch 2
                    </h3>
                    <p className="text-gray-600 text-xs">
                      Testing environment
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
