import crypto from "node:crypto";
import { Router, type IRouter } from "express";
import {
  AddClipboardItemBody,
  AddClipboardItemParams,
  AddClipboardItemResponse,
  ClearClipboardItemsParams,
  CreateClipboardRoomResponse,
  GetClipboardRoomParams,
  GetClipboardRoomResponse,
  JoinClipboardRoomBody,
  JoinClipboardRoomResponse,
} from "@workspace/api-zod";

type ClipboardItem = {
  id: string;
  kind: "text" | "image";
  content: string;
  name: string | null;
  createdAt: Date;
};

type ClipboardRoom = {
  roomId: string;
  otp: string;
  createdAt: Date;
  expiresAt: Date;
  items: ClipboardItem[];
};

const ROOM_TTL_MS = 30 * 60 * 1000;
const rooms = new Map<string, ClipboardRoom>();

function removeExpiredRooms() {
  const now = Date.now();
  for (const [roomId, room] of rooms) {
    if (room.expiresAt.getTime() <= now) {
      rooms.delete(roomId);
    }
  }
}

function findRoomByOtp(otp: string) {
  removeExpiredRooms();
  return [...rooms.values()].find((room) => room.otp === otp);
}

function createRoom(): ClipboardRoom {
  removeExpiredRooms();

  let otp = "";
  do {
    otp = String(crypto.randomInt(100000, 1000000));
  } while (findRoomByOtp(otp));

  const createdAt = new Date();
  const room: ClipboardRoom = {
    roomId: crypto.randomUUID().replaceAll("-", "").slice(0, 16),
    otp,
    createdAt,
    expiresAt: new Date(createdAt.getTime() + ROOM_TTL_MS),
    items: [],
  };
  rooms.set(room.roomId, room);
  return room;
}

function getRoom(roomId: string) {
  removeExpiredRooms();
  return rooms.get(roomId);
}

const router: IRouter = Router();

router.post("/clipboard/rooms", (_req, res) => {
  const response = CreateClipboardRoomResponse.parse(createRoom());
  res.status(201).json(response);
});

router.post("/clipboard/rooms/join", (req, res) => {
  const parsed = JoinClipboardRoomBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Enter a valid 6-digit OTP." });
    return;
  }

  const room = findRoomByOtp(parsed.data.otp);
  if (!room) {
    res.status(404).json({ error: "That room is invalid or has expired." });
    return;
  }

  res.json(JoinClipboardRoomResponse.parse(room));
});

router.get("/clipboard/rooms/:roomId", (req, res) => {
  const parsed = GetClipboardRoomParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "That room link is not valid." });
    return;
  }

  const room = getRoom(parsed.data.roomId);
  if (!room) {
    res.status(404).json({ error: "That room is invalid or has expired." });
    return;
  }

  res.json(GetClipboardRoomResponse.parse(room));
});

router.post("/clipboard/rooms/:roomId/items", (req, res) => {
  const roomParams = AddClipboardItemParams.safeParse(req.params);
  const itemBody = AddClipboardItemBody.safeParse(req.body);
  if (!roomParams.success || !itemBody.success) {
    res.status(400).json({ error: "That clipboard item could not be added." });
    return;
  }

  const room = getRoom(roomParams.data.roomId);
  if (!room) {
    res.status(404).json({ error: "That room is invalid or has expired." });
    return;
  }

  const item: ClipboardItem = {
    id: crypto.randomUUID(),
    kind: itemBody.data.kind,
    content: itemBody.data.content,
    name: itemBody.data.name ?? null,
    createdAt: new Date(),
  };
  room.items.push(item);
  res.status(201).json(AddClipboardItemResponse.parse(item));
});

router.delete("/clipboard/rooms/:roomId/items", (req, res) => {
  const parsed = ClearClipboardItemsParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "That room link is not valid." });
    return;
  }

  const room = getRoom(parsed.data.roomId);
  if (!room) {
    res.status(404).json({ error: "That room is invalid or has expired." });
    return;
  }

  room.items = [];
  res.status(204).send();
});

export default router;