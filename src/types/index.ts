// ── Platform types ──

export type Platform = "whatsapp" | "telegram" | "gmail" | "linkedin";

export type ChatType = "individual" | "group" | "channel" | "thread";

// ── Normalized data models ──

export interface Participant {
  id: string;
  name: string;
  email?: string;
}

export interface NormalizedMessage {
  id: string;
  platform: Platform;
  chatId: string;
  chatName: string;
  chatType: ChatType;
  sender: Participant;
  timestamp: string; // ISO 8601
  content: {
    text: string;
    html?: string;
    links: string[];
    mentions: string[];
  };
  media?: {
    type: "image" | "video" | "audio" | "file";
    filename?: string;
    caption?: string;
  }[];
  replyTo?: string;
}

export interface NormalizedChat {
  id: string;
  platform: Platform;
  name: string;
  type: ChatType;
  participants: Participant[];
  messageCount: number;
  lastMessage?: {
    timestamp: string;
    preview: string;
  };
}

// ── Adapter interface ──

export interface ExtractionOptions {
  since?: Date;
  limit?: number;
}

export interface PlatformAdapter {
  platform: Platform;
  canHandle(url: string): boolean;
  initialize(): Promise<void>;
  extractChats(): Promise<NormalizedChat[]>;
  extractMessages(
    chatId: string,
    options?: ExtractionOptions
  ): Promise<NormalizedMessage[]>;
  cleanup(): void;
}

// ── Extraction state ──

export type ExtractionStatus =
  | "idle"
  | "extracting"
  | "complete"
  | "error"
  | "cancelled";

export interface PlatformProgress {
  platform: Platform;
  status: ExtractionStatus;
  totalChats: number;
  completedChats: number;
  totalMessages: number;
  extractedMessages: number;
  currentChat?: string;
  error?: string;
}

export interface ExtractionState {
  status: ExtractionStatus;
  platforms: PlatformProgress[];
  startedAt?: string;
  completedAt?: string;
}

// ── Settings ──

export type DateRange =
  | "last_7_days"
  | "last_30_days"
  | "last_90_days"
  | "all_time";

export interface ExtractSettings {
  enabledPlatforms: Platform[];
  dateRange: DateRange;
  excludedChats: Record<Platform, string[]>;
  extractionMode: "full" | "incremental";
}

export const DEFAULT_SETTINGS: ExtractSettings = {
  enabledPlatforms: ["whatsapp", "gmail"],
  dateRange: "last_30_days",
  excludedChats: {
    whatsapp: [],
    telegram: [],
    gmail: [],
    linkedin: [],
  },
  extractionMode: "full",
};

// ── Messaging ──

export type MessageType =
  | "START_EXTRACTION"
  | "CANCEL_EXTRACTION"
  | "EXTRACTION_PROGRESS"
  | "EXTRACTION_COMPLETE"
  | "EXTRACTION_ERROR"
  | "GET_STATE"
  | "EXTRACT_PLATFORM"
  | "PLATFORM_RESULT";

export interface ExtensionMessage<T = unknown> {
  type: MessageType;
  payload: T;
}

// ── Manifest output ──

export interface ExtractionManifest {
  version: string;
  extraction_date: string;
  platforms: {
    name: Platform;
    chats_extracted: number;
    messages_extracted: number;
    date_range: {
      start: string;
      end: string;
    };
  }[];
  options: {
    mode: "full" | "incremental";
    date_filter: DateRange;
    excluded_chats: string[];
  };
}
