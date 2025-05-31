// File: app/board/[roomId]/page.tsx
import { redirect } from 'next/navigation';
import prismadb from '@/lib/prisma';
import { Whiteboard } from "@/components/Whiteboard";
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { LiveblocksProvider } from "@/components/LiveblocksProvider";

// Define the proper types for Next.js 15
interface PageProps {
  params: Promise<{ roomId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

/**
 * BoardPage Component
 *
 * This component renders a specific collaborative whiteboard based on the URL.
 * It runs as a React Server Component by default.
 * It extracts the roomId from the URL and uses it to initialize the Liveblocks connection
 * via the LiveblocksProvider, which in turn renders the client-side Room component.
 */
export default async function BoardPage({ params }: PageProps) {
  // Await the params promise in Next.js 15
  const { roomId } = await params;

  // Check authentication status
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect('/signin');
  }

  // Fetch initial board data
  const board = await prismadb.whiteboard.findUnique({
    where: { roomId },
    select: { boardData: true }
  });

  if (!board) {
    redirect('/dashboard');
  }

  return (
    <div className="h-screen w-full">
      <LiveblocksProvider roomId={roomId}>
        <Whiteboard initialData={board.boardData as object} />
      </LiveblocksProvider>
    </div>
  );
}