import { auth, clerkClient } from "@clerk/nextjs/server";
import Link from "next/link";

export default async function Header() {
  const { userId } = await auth();
  const user = userId ? await (await clerkClient()).users.getUser(userId) : null;

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      <h1 className="text-2xl font-bold">TermMap</h1>
      <nav className="flex items-center gap-4">
        {user ? (
          <>
            <span className="text-gray-700">{user.emailAddresses[0]?.emailAddress}</span>
            <Link
              href="/sign-out"
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Sign Out
            </Link>
          </>
        ) : (
          <>
            <Link
              href="/sign-in"
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded"
            >
              Sign In
            </Link>
            <Link
              href="/sign-up"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Sign Up
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
