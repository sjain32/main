import { LiveObject, User, Json, BaseUserMeta } from "@liveblocks/client";

// types/liveblocks.ts (ensure it covers text)
export type CanvasObjectData = {
    id: string;
    ownerConnectionId?: number;
    text?: string;
    fontSize?: number;
    left?: number;
    top?: number;
    scaleX?: number;
    scaleY?: number;
    angle?: number;
    [key: string]: string | number | boolean | undefined;
};

export type CanvasObjectContent = {
    type: string;
    data: CanvasObjectData;
};

export type CanvasObject = LiveObject<CanvasObjectContent> & {
    get(key: 'type'): string;
    get(key: 'data'): CanvasObjectData;
    set(key: 'type', value: string): void;
    set(key: 'data', value: CanvasObjectData): void;
};

export type Presence = {
    cursor: {
        x: number;
        y: number;
    } | null;
    selectedTool?: string;
} & { [key: string]: Json };

export type UserInfo = BaseUserMeta & {
    name?: string | null;
    picture?: string | null;
};

export type LiveblocksUser = User<Presence, UserInfo>;