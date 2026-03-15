import { storage } from "./storage";

export type ChatAssetType = "emoji" | "sticker";

export type ChatAsset = {
  code: string;
  type: ChatAssetType;
  value: string;
  isCustom?: boolean;
};

const CUSTOM_CHAT_ASSETS_KEY = "chat_custom_assets_v1";

const DEFAULT_CHAT_ASSETS: ChatAsset[] = [
  { code: ":smile:", type: "emoji", value: "😄" },
  { code: ":joy:", type: "emoji", value: "😂" },
  { code: ":heart:", type: "emoji", value: "❤️" },
  { code: ":fire:", type: "emoji", value: "🔥" },
  { code: ":thumbsup:", type: "emoji", value: "👍" },
  { code: ":gg:", type: "emoji", value: "👏" },
  {
    code: ":sticker_hype:",
    type: "sticker",
    value: "https://picsum.photos/seed/sticker-hype/240/240",
  },
  {
    code: ":sticker_laugh:",
    type: "sticker",
    value: "https://picsum.photos/seed/sticker-laugh/240/240",
  },
  {
    code: ":sticker_rage:",
    type: "sticker",
    value: "https://picsum.photos/seed/sticker-rage/240/240",
  },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function normalizeAssetCode(rawCode: string): string {
  const cleaned = rawCode.trim().replace(/^:+|:+$/g, "").toLowerCase();
  if (!cleaned) return "";
  return `:${cleaned}:`;
}

export function isValidAssetCode(rawCode: string): boolean {
  return /^:[a-z0-9_+-]+:$/.test(rawCode);
}

export function isValidImageSource(value: string): boolean {
  const trimmed = value.trim();
  return (
    /^https?:\/\/\S+$/i.test(trimmed) ||
    /^data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+$/.test(trimmed)
  );
}

function sanitizeAsset(value: unknown): ChatAsset | null {
  if (!isRecord(value)) return null;
  const type = value.type === "sticker" ? "sticker" : value.type === "emoji" ? "emoji" : null;
  const code = typeof value.code === "string" ? normalizeAssetCode(value.code) : "";
  const rawAssetValue = typeof value.value === "string" ? value.value.trim() : "";
  if (!type || !isValidAssetCode(code) || !rawAssetValue) return null;
  if (type === "sticker" && !isValidImageSource(rawAssetValue)) return null;
  return {
    code,
    type,
    value: rawAssetValue,
    isCustom: true,
  };
}

export function getDefaultChatAssets(): ChatAsset[] {
  return [...DEFAULT_CHAT_ASSETS];
}

export async function loadCustomChatAssets(): Promise<ChatAsset[]> {
  try {
    const raw = await storage.get(CUSTOM_CHAT_ASSETS_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(sanitizeAsset)
      .filter((item): item is ChatAsset => Boolean(item));
  } catch (error) {
    console.warn("Failed to load custom chat assets:", error);
    return [];
  }
}

export async function saveCustomChatAssets(assets: ChatAsset[]): Promise<void> {
  await storage.set(CUSTOM_CHAT_ASSETS_KEY, JSON.stringify(assets));
}

export async function upsertCustomChatAsset(asset: ChatAsset): Promise<ChatAsset[]> {
  const nextAsset = sanitizeAsset(asset);
  if (!nextAsset) {
    throw new Error("Invalid custom asset payload.");
  }

  const current = await loadCustomChatAssets();
  const filtered = current.filter((item) => item.code !== nextAsset.code);
  const next = [nextAsset, ...filtered];
  await saveCustomChatAssets(next);
  return next;
}

export function mergeChatAssets(customAssets: ChatAsset[]): ChatAsset[] {
  const merged = new Map<string, ChatAsset>();
  DEFAULT_CHAT_ASSETS.forEach((asset) => merged.set(asset.code, asset));
  customAssets.forEach((asset) => merged.set(asset.code, { ...asset, isCustom: true }));
  return Array.from(merged.values());
}
