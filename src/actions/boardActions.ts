// File: actions/boardActions.ts

// Directive to mark this module's exports as Server Actions.
// These functions can then be imported into Client and Server Components.
'use server';

import { revalidatePath } from 'next/cache'; // Optional: To trigger re-fetching data on the client
import prismadb from '@/lib/prisma'; // Import the singleton Prisma Client instance
import { Prisma } from '@prisma/client'; // Import Prisma types if needed for input validation
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { Cuid } from '@/lib/cuid';
import type { Session } from 'next-auth';

/**
 * Server Action to save or update the state of a whiteboard.
 * Uses Prisma's upsert operation to create or update the board record based on roomId.
 *
 * @param roomId - The unique identifier for the whiteboard room.
 * @param boardData - The serialized state of the whiteboard (e.g., Fabric.js canvas JSON). Should be a JSON-serializable value.
 * @returns An object indicating success or failure, potentially with the saved data or an error message.
 */
export async function saveBoardState(roomId: string, boardData: Prisma.InputJsonValue): Promise<{ success: boolean; error?: string; whiteboard?: unknown }> {
    // Basic validation
    if (!roomId || typeof roomId !== 'string' || roomId.trim() === '') {
        return { success: false, error: 'Invalid Room ID provided.' };
    }

    // Optional: Check if boardData is serializable
    try {
        JSON.stringify(boardData);
    } catch {
        return { success: false, error: 'boardData is not JSON-serializable.' };
    }

    try {
        console.log(`Server Action: Attempting to save state for roomId: ${roomId}`);

        const savedWhiteboard = await prismadb.whiteboard.upsert({
            where: { roomId },
            update: { boardData },
            create: { roomId, boardData, name: 'Untitled Whiteboard', userId: '1' },
        });

        console.log(`Server Action: Successfully saved state for roomId: ${roomId}`);
        return { success: true, whiteboard: savedWhiteboard };
    } catch (error) {
        console.error(`Server Action Error: Failed to save board state for roomId: ${roomId}`, error);
        return { success: false, error: 'Failed to save whiteboard state.' };
    }
}

/**
 * Server Action to create a new whiteboard record in the database.
 * Associates the new board with the currently authenticated user.
 * Includes robust error handling for ID generation and database operations.
 *
 * @returns An object indicating success or failure, including the new board's roomId on success.
 */
export async function createBoard(): Promise<{
    success: boolean;
    error?: string;
    board?: { roomId: string };
}> {
    // 1. --- Verify User Authentication ---
    const session = await getServerSession(authOptions) as Session | null;

    if (!session?.user?.id) {
        console.error("[Server Action - createBoard] Error: User not authenticated.");
        return { success: false, error: 'User not authenticated.' };
    }
    const userId = session.user.id;
    console.log(`[Server Action - createBoard] Authenticated user: ${userId}`);

    // 2. --- Generate Unique Room ID ---
    let roomId: string;
    try {
        roomId = Cuid.createId();
        console.log(`[Server Action - createBoard] Generated roomId: ${roomId}`);
    } catch (error) {
        console.error("[Server Action - createBoard] Failed to generate room ID:", error);
        return { success: false, error: 'Failed to generate unique board identifier. Please try again.' };
    }

    // 3. --- Define Board Name ---
    const boardName = "Untitled Whiteboard";

    // 4. --- Create Board in Database ---
    try {
        console.log(`[Server Action - createBoard] Attempting to create board for user ${userId} with roomId ${roomId}`);

        const newBoard = await prismadb.whiteboard.create({
            data: {
                userId: userId,
                roomId: roomId,
                name: boardName,
            },
            select: {
                roomId: true,
            }
        });

        console.log(`[Server Action - createBoard] Successfully created board with roomId: ${newBoard.roomId}`);

        // 5. --- Revalidate Dashboard Path ---
        revalidatePath('/dashboard');

        // 6. --- Return Success Response ---
        return { success: true, board: { roomId: newBoard.roomId } };

    } catch (error) {
        console.error("[Server Action - createBoard] Database error:", error);
        
        // Check for specific error codes
        if (error && typeof error === 'object' && 'code' in error) {
            const errorCode = error.code as string;
            
            switch (errorCode) {
                case 'P2002': // Unique constraint violation
                    return { 
                        success: false, 
                        error: 'A board with this identifier already exists. Please try again.' 
                    };
                case 'P2003': // Foreign key constraint violation
                    return { 
                        success: false, 
                        error: 'Invalid user reference. Please try again.' 
                    };
            }
        }

        // Handle other types of errors
        return { 
            success: false, 
            error: 'An unexpected error occurred. Please try again later.' 
        };
    }
}

/**
 * Server Action to rename a whiteboard.
 * Verifies that the board belongs to the authenticated user before renaming.
 *
 * @param boardId - The unique database ID (Prisma ID) of the board to rename.
 * @param newName - The desired new name for the board.
 * @returns An object indicating success or failure.
 */
export async function renameBoard(
    boardId: string,
    newName: string
): Promise<{ success: boolean; error?: string }> {
    // 1. --- Verify User Authentication ---
    const session = await getServerSession(authOptions) as Session | null;
    if (!session?.user?.id) {
        console.error("[Server Action - renameBoard] Error: User not authenticated.");
        return { success: false, error: 'User not authenticated.' };
    }
    const userId = session.user.id;

    // 2. --- Validate Input ---
    if (!boardId || typeof boardId !== 'string' || boardId.trim() === '') {
        return { success: false, error: 'Invalid Board ID provided.' };
    }
    const trimmedName = newName.trim();
    if (!trimmedName || trimmedName.length === 0) {
        return { success: false, error: 'Board name cannot be empty.' };
    }
    // Optional: Add length limit for board name
    if (trimmedName.length > 60) {
        return { success: false, error: 'Board name cannot exceed 60 characters.' };
    }

    console.log(`[Server Action - renameBoard] User ${userId} attempting to rename board ${boardId} to "${trimmedName}"`);

    // 3. --- Update Board Name in Database ---
    try {
        // Use updateMany to ensure we only update if the boardId AND userId match.
        // This prevents a user from renaming another user's board.
        const updateResult = await prismadb.whiteboard.updateMany({
            where: {
                // Match the specific board by its unique Prisma ID
                id: boardId,
                // AND ensure the board belongs to the currently logged-in user
                userId: userId,
            },
            // Specify the field to update
            data: {
                name: trimmedName, // Use the validated and trimmed name
                // 'updatedAt' will be updated automatically by Prisma (@updatedAt directive)
            },
        });

        // Check if any record was actually updated
        // updateResult.count will be 1 if successful, 0 if no board matched (wrong ID or not owner)
        if (updateResult.count === 0) {
            console.warn(`[Server Action - renameBoard] Board not found or user ${userId} does not own board ${boardId}. No update performed.`);
            // Return an error indicating failure, possibly due to permissions or wrong ID
            return { success: false, error: 'Board not found or permission denied.' };
        }

        console.log(`[Server Action - renameBoard] Successfully renamed board ${boardId}.`);

        // 4. --- Revalidate Dashboard Path ---
        // Ensure the dashboard list reflects the new name immediately.
        revalidatePath('/dashboard');

        // 5. --- Return Success Response ---
        return { success: true };

    } catch (error) {
        console.error(`[Server Action - renameBoard] Database error for board ${boardId}:`, error);
        // Handle potential database errors
        return { success: false, error: 'Failed to rename whiteboard due to a server error.' };
    }
}

/**
 * Server Action to delete a whiteboard.
 * Verifies that the board belongs to the authenticated user before deletion.
 *
 * @param boardId - The unique database ID (Prisma ID) of the board to delete.
 * @returns An object indicating success or failure.
 */
export async function deleteBoard(
    boardId: string
): Promise<{ success: boolean; error?: string }> {
    // 1. --- Verify User Authentication ---
    const session = await getServerSession(authOptions) as Session | null;
    if (!session?.user?.id) {
        console.error("[Server Action - deleteBoard] Error: User not authenticated.");
        return { success: false, error: 'User not authenticated.' };
    }
    const userId = session.user.id;

    // 2. --- Validate Input ---
    if (!boardId || typeof boardId !== 'string' || boardId.trim() === '') {
        return { success: false, error: 'Invalid Board ID provided.' };
    }

    console.log(`[Server Action - deleteBoard] User ${userId} attempting to delete board ${boardId}`);

    // 3. --- Delete Board from Database ---
    try {
        // Use deleteMany to ensure we only delete if the boardId AND userId match.
        // This prevents a user from deleting another user's board and handles
        // the case where the boardId might not exist gracefully.
        const deleteResult = await prismadb.whiteboard.deleteMany({
            where: {
                // Match the specific board by its unique Prisma ID
                id: boardId,
                // AND ensure the board belongs to the currently logged-in user
                userId: userId,
            },
        });

        // Check if any record was actually deleted
        // deleteResult.count will be 1 if successful, 0 if no board matched (wrong ID or not owner)
        if (deleteResult.count === 0) {
            console.warn(`[Server Action - deleteBoard] Board not found or user ${userId} does not own board ${boardId}. No deletion performed.`);
            // Return an error indicating failure, possibly due to permissions or wrong ID
            return { success: false, error: 'Board not found or permission denied.' };
        }

        console.log(`[Server Action - deleteBoard] Successfully deleted board ${boardId}.`);

        // 4. --- Revalidate Dashboard Path ---
        // Ensure the dashboard list reflects the deletion immediately.
        revalidatePath('/dashboard');

        // 5. --- Return Success Response ---
        return { success: true };

    } catch (error) {
        console.error(`[Server Action - deleteBoard] Database error for board ${boardId}:`, error);
        // Handle potential database errors
        return { success: false, error: 'Failed to delete whiteboard due to a server error.' };
    }
}

// You can add other board-related Server Actions in this file later (e.g., loadBoardState).