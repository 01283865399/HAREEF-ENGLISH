import { beforeEach, describe, expect, it, vi } from "vitest";

const { backendRequest, backendEnabled } = vi.hoisted(() => ({
  backendRequest: vi.fn(),
  backendEnabled: { value: true },
}));

vi.mock("../lib/supabase", () => ({
  getSupabaseClient: () => {
    throw new Error("Supabase should not be called when the backend is enabled.");
  },
}));

vi.mock("./backendApi", () => ({
  backendRequest,
  isBackendApiConfigured: () => backendEnabled.value,
}));

import {
  createAIConversation,
  deleteAIConversation,
  listAIConversations,
  loadAIMessages,
  renameAIConversation,
  saveAIMessage,
} from "./aiConversationService";

describe("AI conversation backend integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    backendEnabled.value = true;
  });

  it("uses authenticated backend endpoints for conversation and message operations", async () => {
    const conversation = {
      id: "conversation-1",
      user_id: "owner-1",
      title: "Grammar",
      created_at: "2026-10-21T00:00:00Z",
      updated_at: "2026-10-21T00:00:00Z",
    };
    const message = {
      id: "message-1",
      conversation_id: "conversation-1",
      user_id: "owner-1",
      role: "student" as const,
      text: "Explain the present perfect.",
      source: null,
      created_at: "2026-10-21T00:00:00Z",
    };
    backendRequest
      .mockResolvedValueOnce({ conversations: [conversation] })
      .mockResolvedValueOnce({ conversation })
      .mockResolvedValueOnce({ messages: [message] })
      .mockResolvedValueOnce({ saved: true })
      .mockResolvedValueOnce({ conversationId: conversation.id })
      .mockResolvedValueOnce({ conversationId: conversation.id });

    await expect(listAIConversations("owner-1")).resolves.toEqual([conversation]);
    await expect(createAIConversation("owner-1", "Grammar")).resolves.toEqual(
      conversation,
    );
    await expect(loadAIMessages("owner-1", conversation.id)).resolves.toEqual([
      message,
    ]);
    await expect(
      saveAIMessage("owner-1", conversation.id, {
        role: "student",
        text: message.text,
        source: null,
      }),
    ).resolves.toBeUndefined();
    await expect(
      renameAIConversation("owner-1", conversation.id, "New title"),
    ).resolves.toBeUndefined();
    await expect(
      deleteAIConversation("owner-1", conversation.id),
    ).resolves.toBeUndefined();

    expect(backendRequest.mock.calls.map(([path]) => path)).toEqual([
      "/ai/conversations",
      "/ai/conversations",
      "/ai/conversations/conversation-1/messages",
      "/ai/conversations/conversation-1/messages",
      "/ai/conversations/conversation-1",
      "/ai/conversations/conversation-1",
    ]);
  });
});
