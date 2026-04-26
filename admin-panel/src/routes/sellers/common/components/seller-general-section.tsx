import { ChatBubbleLeftRight, PencilSquare, User } from "@medusajs/icons";
import { Button, Container, Divider, Drawer, Heading, Text, usePrompt } from "@medusajs/ui";

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import type { VendorSeller } from "@custom-types/seller";

import { ActionsButton } from "@components/common/actions-button";
import { SellerStatusBadge } from "@components/common/seller-status-badge";

import {
  connectSocket,
  disconnectSocket,
  emitMessagesRead,
  emitTypingStart,
  emitTypingStop,
  joinConversation,
  leaveConversation,
} from "@lib/messenger/socket";
import {
  findOrCreateConversation,
  getMessages,
  markConversationRead,
  sendMessage,
} from "@lib/messenger/client";
import type { Message } from "@lib/messenger/types";

import { useUpdateSeller } from "@hooks/api/sellers";

// ── SellerDirectChat ─────────────────────────────────────────────────────
function SellerDirectChat({
  seller,
  adminId,
}: {
  seller: VendorSeller;
  adminId?: string;
}) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [typingIds, setTypingIds] = useState<string[]>([]);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initRef = useRef(false);

  const memberId = seller.members?.[0]?.id;

  // Find or create conversation with this seller on mount
  useEffect(() => {
    if (initRef.current || !memberId) return;
    initRef.current = true;
    setIsInitializing(true);
    findOrCreateConversation({
      targetUserId: memberId,
      targetUserType: "SELLER",
      subject: `Mağaza: ${seller.name ?? seller.email}`,
    })
      .then(({ conversation }) => {
        setConversationId(conversation.id);
        return getMessages(conversation.id);
      })
      .then(({ messages: msgs }) => {
        setMessages([...msgs].reverse());
        setIsInitializing(false);
      })
      .catch((err) => {
        setError(err?.message ?? "Sohbet başlatılamadı");
        setIsInitializing(false);
      });
  }, [memberId, seller.name, seller.email]);

  // Socket connection
  useEffect(() => {
    if (!conversationId) return;
    const socket = connectSocket();
    joinConversation(conversationId);
    emitMessagesRead(conversationId);
    markConversationRead(conversationId).catch(() => {});

    socket.on("message_received", (msg: Message) => {
      if (msg.conversationId !== conversationId) return;
      setMessages((prev) =>
        prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]
      );
    });

    socket.on(
      "typing_update",
      ({
        conversationId: cid,
        typingUserIds: ids,
      }: {
        conversationId: string;
        typingUserIds: string[];
      }) => {
        if (cid === conversationId) {
          setTypingIds(ids.filter((id) => id !== adminId));
        }
      }
    );

    return () => {
      leaveConversation(conversationId);
      disconnectSocket();
    };
  }, [conversationId, adminId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !conversationId) return;
    const text = input.trim();
    setInput("");
    await sendMessage(conversationId, text).catch(() => {});
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    if (!conversationId) return;
    emitTypingStart(conversationId);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(
      () => emitTypingStop(conversationId),
      2000
    );
  };

  if (isInitializing) {
    return (
      <div className="flex h-full items-center justify-center text-ui-fg-muted text-sm">
        Sohbet başlatılıyor...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center text-red-500 text-sm p-4 text-center">
        {error}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-ui-bg-subtle">
        {messages.length === 0 && (
          <p className="text-center text-ui-fg-muted text-sm mt-8">
            Henüz mesaj yok. İlk mesajı siz gönderin.
          </p>
        )}
        {messages.map((msg) => {
          const isMe = msg.senderType === "ADMIN";
          if (msg.messageType === "NOTIFICATION") {
            return (
              <div key={msg.id} className="flex justify-center">
                <span className="text-xs text-ui-fg-muted bg-ui-bg-base border border-ui-border-base rounded-full px-3 py-1">
                  {msg.content}
                </span>
              </div>
            );
          }
          return (
            <div
              key={msg.id}
              className={`flex ${isMe ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                  isMe
                    ? "bg-ui-button-inverted text-ui-fg-on-inverted"
                    : "bg-ui-bg-base text-ui-fg-base border border-ui-border-base"
                }`}
              >
                {msg.messageType === "IMAGE" && msg.imageUrl ? (
                  <img
                    src={msg.imageUrl}
                    alt="img"
                    className="max-w-full rounded-lg mb-1"
                  />
                ) : null}
                <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                <p
                  className={`text-[10px] mt-1 opacity-60 text-right ${
                    isMe ? "text-ui-fg-on-inverted" : "text-ui-fg-muted"
                  }`}
                >
                  {new Date(msg.createdAt).toLocaleTimeString("tr-TR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {isMe && msg.readAt && <span className="ml-1">· Görüldü</span>}
                </p>
              </div>
            </div>
          );
        })}
        {typingIds.length > 0 && (
          <div className="flex justify-start">
            <div className="bg-ui-bg-base border border-ui-border-base rounded-2xl px-3 py-2">
              <div className="flex gap-1">
                {[0, 150, 300].map((delay) => (
                  <span
                    key={delay}
                    className="w-1.5 h-1.5 bg-ui-fg-muted rounded-full animate-bounce"
                    style={{ animationDelay: `${delay}ms` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-ui-border-base bg-ui-bg-base flex gap-2 items-center">
        <input
          type="text"
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Mesaj yazın..."
          className="flex-1 px-3 py-2 text-sm rounded-full border border-ui-border-base bg-ui-bg-subtle text-ui-fg-base focus:outline-none focus:border-ui-border-interactive"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim()}
          className="w-9 h-9 rounded-full bg-ui-button-inverted text-ui-fg-on-inverted flex items-center justify-center disabled:opacity-40 hover:opacity-90 transition-opacity flex-shrink-0"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export const SellerGeneralSection = ({ seller }: { seller: VendorSeller }) => {
  const navigate = useNavigate();
  const [chatOpen, setChatOpen] = useState(false);

  const { mutateAsync: suspendSeller } = useUpdateSeller();

  const dialog = usePrompt();

  const handleSuspend = async () => {
    const res = await dialog({
      title:
        seller.store_status === "SUSPENDED"
          ? "Activate account"
          : "Suspend account",
      description:
        seller.store_status === "SUSPENDED"
          ? "Are you sure you want to activate this account?"
          : "Are you sure you want to suspend this account?",
      verificationText: seller.email || seller.name || "",
    });

    if (!res) {
      return;
    }

    if (seller.store_status === "SUSPENDED") {
      await suspendSeller({ id: seller.id, data: { store_status: "ACTIVE" } });
    } else {
      await suspendSeller({
        id: seller.id,
        data: { store_status: "SUSPENDED" },
      });
    }
  };

  return (
    <>
      <div>
        <Container className="mb-2">
          <div className="flex items-center justify-between">
            <Heading>{seller.email || seller.name}</Heading>
            {/* ── Center: Chat balloon ─────────────────────────── */}
            <div className="flex-1 flex justify-center">
              <Drawer open={chatOpen} onOpenChange={setChatOpen}>
                <Drawer.Trigger asChild>
                  <Button
                    variant="transparent"
                    size="small"
                    className="flex items-center gap-1.5"
                    disabled={!seller.members?.[0]?.id}
                    title={
                      seller.members?.[0]?.id
                        ? "Satıcıya mesaj gönder"
                        : "Bu satıcının üyesi yok"
                    }
                  >
                    <ChatBubbleLeftRight className="text-ui-fg-subtle" />
                    <span className="text-ui-fg-subtle text-xs font-medium">
                      Mesaj Gönder
                    </span>
                  </Button>
                </Drawer.Trigger>
                <Drawer.Content className="flex flex-col" style={{ maxWidth: 420 }}>
                  <Drawer.Header>
                    <Drawer.Title>
                      {seller.name ?? seller.email} ile Sohbet
                    </Drawer.Title>
                  </Drawer.Header>
                  <div className="flex-1 overflow-hidden" style={{ height: "calc(100% - 64px)" }}>
                    {chatOpen && (
                      <SellerDirectChat seller={seller} />
                    )}
                  </div>
                </Drawer.Content>
              </Drawer>
            </div>
            {/* ── Right: Status + Actions ──────────────────────── */}
            <div className="flex items-center gap-2">
              <SellerStatusBadge status={seller.store_status || "pending"} />
              <ActionsButton
                actions={[
                  {
                    label: "Edit",
                    onClick: () =>
                      navigate(
                        `/sellers/${seller.handle || seller.id}/edit`
                      ),
                    icon: <PencilSquare />,
                  },
                  {
                    label:
                      seller.store_status === "SUSPENDED"
                        ? "Activate account"
                        : "Suspend account",
                    onClick: () => handleSuspend(),
                    icon: <User />,
                  },
                ]}
              />
            </div>
          </div>
        </Container>
      </div>
      <div className="flex gap-4">
        <Container className="px-0">
          <div className="flex items-center justify-between px-8 py-4">
            <div>
              <Heading>Store</Heading>
            </div>
          </div>
          <div>
            <Divider />
            <div className="flex px-8 py-4">
              <Text className="w-1/2 font-medium text-ui-fg-subtle">Name</Text>
              <Text className="w-1/2">{seller.name}</Text>
            </div>
            <Divider />
            <div className="flex px-8 py-4">
              <Text className="w-1/2 font-medium text-ui-fg-subtle">Handle</Text>
              <Text className="w-1/2 font-mono text-sm">{seller.handle || "—"}</Text>
            </div>
            <Divider />
            <div className="flex px-8 py-4">
              <Text className="w-1/2 font-medium text-ui-fg-subtle">Email</Text>
              <Text className="w-1/2">{seller.email}</Text>
            </div>
            <Divider />
            <div className="flex px-8 py-4">
              <Text className="w-1/2 font-medium text-ui-fg-subtle">Phone</Text>
              <Text className="w-1/2">{seller.phone}</Text>
            </div>
            <Divider />
            <div className="flex px-8 py-4">
              <Text className="w-1/2 font-medium text-ui-fg-subtle">
                Description
              </Text>
              <Text className="w-1/2">{seller.description}</Text>
            </div>
          </div>
        </Container>
        <Container className="px-0">
          <div className="flex items-center justify-between px-8 py-4">
            <div>
              <Heading>Address</Heading>
            </div>
          </div>
          <div>
            <Divider />
            <div className="flex px-8 py-4">
              <Text className="w-1/2 font-medium text-ui-fg-subtle">
                Address
              </Text>
              <Text className="w-1/2">{seller.address_line}</Text>
            </div>
            <Divider />
            <div className="flex px-8 py-4">
              <Text className="w-1/2 font-medium text-ui-fg-subtle">
                Postal Code
              </Text>
              <Text className="w-1/2">{seller.postal_code}</Text>
            </div>
            <Divider />
            <div className="flex px-8 py-4">
              <Text className="w-1/2 font-medium text-ui-fg-subtle">City</Text>
              <Text className="w-1/2">{seller.city}</Text>
            </div>
            <Divider />
            <div className="flex px-8 py-4">
              <Text className="w-1/2 font-medium text-ui-fg-subtle">
                Country
              </Text>
              <Text className="w-1/2">{seller.country_code}</Text>
            </div>
            <Divider />
            <div className="flex px-8 py-4">
              <Text className="w-1/2 font-medium text-ui-fg-subtle">TaxID</Text>
              <Text className="w-1/2">{seller.tax_id}</Text>
            </div>
          </div>
        </Container>
      </div>
    </>
  );
};
