import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Send, 
  MessageSquare, 
  Package, 
  Search, 
  Check, 
  CheckCheck,
  User as UserIcon,
  Clock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { chatService } from '../services/api';
import { Conversation, Message } from '../types';
import { SafeImg } from '../components/SafeImg';

export const ChatPage: React.FC = () => {
  const { currentUser } = useAuth();
  const location = useLocation();
  const stateConvId = (location.state as any)?.conversationId;

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  const fetchConversations = () => {
    if (!currentUser) return;
    setLoading(true);
    setError(null);
    chatService.getConversations(currentUser.id)
      .then((convs) => {
        setConversations(convs);
        if (stateConvId) {
          setActiveConvId(stateConvId);
        } else if (convs.length > 0) {
          setActiveConvId(convs[0].id);
        }
      })
      .catch((err: any) => {
        setError(err?.message || 'Failed to load conversations from backend.');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchConversations();
  }, [currentUser, stateConvId]);

  useEffect(() => {
    if (!activeConvId) return;
    chatService.getMessages(activeConvId)
      .then((msgs) => {
        setMessages(msgs);
      })
      .catch((err: any) => {
        console.error('Failed to load messages for conversation', err);
      });
  }, [activeConvId]);

  if (!currentUser) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <MessageSquare className="w-12 h-12 text-stone-400 mx-auto" />
        <h2 className="text-xl font-bold text-stone-900">Sign in to view messages</h2>
        <p className="text-xs text-stone-500">
          Campus direct messaging requires an authenticated student session.
        </p>
        <a
          href="/login"
          className="inline-block px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700"
        >
          Sign In
        </a>
      </div>
    );
  }

  const activeConversation = conversations.find((c) => c.id === activeConvId);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !currentUser || !activeConversation) return;

    const text = inputText.trim();
    setInputText('');
    setSendError(null);
    setSending(true);

    try {
      const { message } = await chatService.sendMessage({
        conversationId: activeConversation.id,
        recipientId: activeConversation.otherParticipant.id,
        senderId: currentUser.id,
        text,
        itemId: activeConversation.itemId,
        itemTitle: activeConversation.itemTitle,
      });

      setMessages((prev) => [...prev, message]);

      // update conversation in list
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversation.id
            ? {
                ...c,
                lastMessage: {
                  text,
                  timestamp: message.timestamp,
                  senderId: currentUser.id,
                },
                updatedAt: message.timestamp,
              }
            : c
        )
      );
    } catch (err: any) {
      setSendError(err?.message || 'Message could not be sent. Please try again.');
      setInputText(text);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900">
          Campus Messages
        </h1>
        <p className="text-sm text-stone-500 mt-1">
          Coordinate meetup spots, loan dates, and return handovers with verified students.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[580px]">
        {/* Left Column: Conversations List */}
        <div className="md:col-span-4 border-r border-stone-200 flex flex-col bg-stone-50/50">
          <div className="p-4 border-b border-stone-200">
            <h2 className="text-xs font-bold text-stone-500 uppercase tracking-wide">
              Conversations ({conversations.length})
            </h2>
          </div>

          <div className="divide-y divide-stone-100 overflow-y-auto flex-1">
            {loading ? (
              <div className="p-4 text-xs text-stone-400">Loading messages...</div>
            ) : conversations.length === 0 ? (
              <div className="p-6 text-center text-xs text-stone-400">
                No active conversations yet. Messages are started when requesting or listing gear.
              </div>
            ) : (
              conversations.map((conv) => {
                const isSelected = conv.id === activeConvId;
                return (
                  <button
                    key={conv.id}
                    onClick={() => setActiveConvId(conv.id)}
                    className={`w-full p-4 text-left flex items-start gap-3 transition-colors ${
                      isSelected ? 'bg-white shadow-xs border-l-2 border-emerald-600' : 'hover:bg-stone-100/60'
                    }`}
                  >
                    <SafeImg
                      src={conv.otherParticipant.avatarUrl}
                      alt=""
                      className="w-10 h-10 rounded-full object-cover shrink-0 border border-stone-200"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-xs text-stone-900 truncate">
                          {conv.otherParticipant.name}
                        </p>
                        {conv.lastMessage && (
                          <span className="text-[10px] text-stone-400 shrink-0">
                            {new Date(conv.lastMessage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>

                      {conv.itemTitle && (
                        <p className="text-[11px] text-emerald-800 font-medium truncate flex items-center gap-1 mt-0.5">
                          <Package className="w-3 h-3 shrink-0" />
                          <span>{conv.itemTitle}</span>
                        </p>
                      )}

                      <p className="text-xs text-stone-500 truncate mt-1">
                        {conv.lastMessage?.text || 'No messages yet'}
                      </p>
                    </div>

                    {conv.unreadCount > 0 && (
                      <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0 mt-1" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Chat Window */}
        <div className="md:col-span-8 flex flex-col h-[580px] bg-white">
          {activeConversation ? (
            <>
              {/* Active Conversation Header */}
              <div className="p-4 border-b border-stone-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <SafeImg
                    src={activeConversation.otherParticipant.avatarUrl}
                    alt=""
                    className="w-10 h-10 rounded-full object-cover border border-stone-200"
                  />
                  <div>
                    <h3 className="text-sm font-bold text-stone-900">
                      {activeConversation.otherParticipant.name}
                    </h3>
                    <p className="text-xs text-stone-500">
                      {activeConversation.otherParticipant.college} · {activeConversation.otherParticipant.department}
                    </p>
                  </div>
                </div>

                {activeConversation.itemTitle && (
                  <div className="hidden sm:flex items-center gap-1 text-xs text-stone-600 bg-stone-100 px-3 py-1.5 rounded-lg border border-stone-200/60">
                    <Package className="w-3.5 h-3.5 text-stone-500" />
                    <span className="font-medium truncate max-w-[200px]">{activeConversation.itemTitle}</span>
                  </div>
                )}
              </div>

              {/* Messages Flow */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-stone-50/30">
                {messages.length === 0 ? (
                  <div className="text-center text-xs text-stone-400 py-12">
                    Say hello! Coordinate handover times and campus spots safely.
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.senderId === currentUser?.id;
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-md px-4 py-2.5 rounded-2xl text-xs leading-relaxed ${
                            isMe
                              ? 'bg-emerald-600 text-white rounded-br-xs shadow-xs'
                              : 'bg-white text-stone-800 border border-stone-200 rounded-bl-xs shadow-xs'
                          }`}
                        >
                          <p>{msg.text}</p>
                        </div>
                        <span className="text-[10px] text-stone-400 mt-1 px-1">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Input Bar */}
              {sendError && (
                <div className="mx-3 mb-1 p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
                  {sendError}
                </div>
              )}
              <form onSubmit={handleSendMessage} className="p-3 border-t border-stone-200 flex items-center gap-2 bg-white">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={`Message ${activeConversation.otherParticipant.name.split(' ')[0]}...`}
                  className="flex-1 px-4 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs focus:ring-emerald-500 focus:border-emerald-500"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim() || sending}
                  className="p-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl shadow-xs transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-stone-400 text-xs">
              <MessageSquare className="w-12 h-12 stroke-1 text-stone-300 mb-2" />
              <p>Select a conversation from the left to read messages.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
