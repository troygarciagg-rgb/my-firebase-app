import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getHostMessages, replyToMessage, deleteMessage } from '../../utils/firebaseFunctions';
import Navbar from '../../components/Navbar';
import Sidebar from '../../components/Sidebar';

export default function Messages() {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedThread, setSelectedThread] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);
  const [deletingMessageId, setDeletingMessageId] = useState(null);

  const loadMessages = async () => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');
      const messagesData = await getHostMessages(currentUser.uid);
      setMessages(messagesData);
    } catch (error) {
      console.error('Error loading messages:', error);
      setError(error.message || 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 10000);
    return () => clearInterval(interval);
  }, [currentUser]);

  const groupMessagesByThread = () => {
    const threads = new Map();

    messages.forEach((message) => {
      const guestKey = message.guestId || message.receiverId || message.senderId;
      const listingKey = message.listingId || 'general';
      const threadKey = `${listingKey}_${guestKey}`;

      if (!threads.has(threadKey)) {
        threads.set(threadKey, {
          key: threadKey,
          listingId: message.listingId,
          listingTitle: message.listingTitle,
          guestId: guestKey,
          guestName: message.guestName || message.guestEmail || 'Guest',
          messages: [],
          lastMessageTime: 0
        });
      }

      const thread = threads.get(threadKey);
      thread.messages.push(message);
      if (message.createdAtValue > thread.lastMessageTime) {
        thread.lastMessageTime = message.createdAtValue;
      }
    });

    threads.forEach((thread) => {
      thread.messages.sort((a, b) => a.createdAtValue - b.createdAtValue);
    });

    return Array.from(threads.values()).sort((a, b) => b.lastMessageTime - a.lastMessageTime);
  };

  const threads = groupMessagesByThread();

  useEffect(() => {
    if (!selectedThread && threads.length > 0) {
      setSelectedThread(threads[0].key);
    }
  }, [threads, selectedThread]);

  const currentThread = threads.find((thread) => thread.key === selectedThread);

  const handleSendReply = async () => {
    if (!replyText.trim() || !currentThread) return;

    try {
      setReplying(true);
      setError('');
      const lastMessage = currentThread.messages[currentThread.messages.length - 1];

      await replyToMessage(lastMessage.id, {
        senderId: currentUser.uid,
        receiverId: currentThread.guestId || lastMessage.guestId || lastMessage.receiverId,
        hostId: currentUser.uid,
        guestId: currentThread.guestId || lastMessage.guestId || lastMessage.receiverId,
        listingId: currentThread.listingId,
        listingTitle: currentThread.listingTitle,
        message: replyText.trim(),
        topic: `Re: ${lastMessage.topic || 'Message'}`
      });

      await loadMessages();
      setReplyText('');
    } catch (error) {
      console.error('Error sending reply:', error);
      setError(error.message || 'Failed to send reply');
    } finally {
      setReplying(false);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (!messageId) return;

    try {
      setDeletingMessageId(messageId);
      setError('');
      await deleteMessage(messageId);
      await loadMessages();
    } catch (error) {
      console.error('Error deleting message:', error);
      setError(error.message || 'Failed to delete message');
    } finally {
      setDeletingMessageId(null);
    }
  };

  const handleSelectThread = (threadKey) => {
    setSelectedThread(threadKey);
    setReplyText('');
  };

  return (
    <>
      <Navbar />
      <div className="flex">
        <Sidebar role="host" />
        <div className="flex-1 p-8 bg-gray-50 min-h-screen">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold mb-6 text-gray-900">Messages</h1>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                <p className="font-semibold">Error</p>
                <p className="text-sm">{error}</p>
              </div>
            )}

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading messages...</p>
              </div>
            ) : threads.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No messages yet</h3>
                <p className="text-gray-600">You'll see messages from guests here when they contact you about your listings.</p>
              </div>
            ) : (
              <div className="flex gap-6 h-[calc(100vh-200px)]">
                {/* Thread List */}
                <div className="w-1/3 bg-white rounded-2xl shadow-lg overflow-hidden flex flex-col">
                  <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-cyan-50">
                    <h2 className="text-lg font-semibold text-gray-900">Conversations</h2>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    {threads.map((thread) => (
                      <button
                        key={thread.key}
                        onClick={() => handleSelectThread(thread.key)}
                        className={`w-full p-4 text-left border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                          selectedThread === thread.key ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3 mb-1">
                          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                            {thread.guestName?.[0] || 'G'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 truncate">{thread.guestName || 'Guest'}</h3>
                            <p className="text-xs text-gray-500 truncate">{thread.listingTitle || 'General'}</p>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 truncate mt-1">
                          {thread.messages[thread.messages.length - 1]?.message || 'No message'}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {thread.messages[thread.messages.length - 1]?.timestamp || ''}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Message Thread View */}
                <div className="flex-1 bg-white rounded-2xl shadow-lg flex flex-col">
                  {currentThread ? (
                    <>
                      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-cyan-50">
                        <h2 className="text-lg font-semibold text-gray-900">{currentThread.guestName || 'Guest'}</h2>
                        <p className="text-sm text-gray-500">{currentThread.listingTitle || 'General Conversation'}</p>
                      </div>

                      <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {currentThread.messages.map((message) => {
                          const isHostMessage = message.senderId === currentUser.uid;
                          return (
                            <div
                              key={message.id}
                              className={`flex ${isHostMessage ? 'justify-end' : 'justify-start'}`}
                            >
                              <div
                                className={`relative group max-w-[70%] rounded-2xl p-4 ${
                                  isHostMessage
                                    ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white'
                                    : 'bg-gray-100 text-gray-900'
                                }`}
                              >
                                <p className="text-sm font-medium mb-1">
                                  {isHostMessage ? 'You' : currentThread.guestName || 'Guest'}
                                </p>
                                <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                                <p className={`text-xs mt-2 ${isHostMessage ? 'text-indigo-100' : 'text-gray-500'}`}>
                                  {message.timestamp}
                                </p>

                                {isHostMessage && (
                                  <button
                                    onClick={() => handleDeleteMessage(message.id)}
                                    disabled={deletingMessageId === message.id}
                                    className="absolute -top-3 -right-3 px-3 py-1 text-xs rounded-full bg-white/90 text-indigo-600 shadow-md border border-white/60 opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Unsend message"
                                  >
                                    {deletingMessageId === message.id ? 'Removing...' : 'Unsend'}
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Reply Input */}
                      <div className="p-4 border-t border-gray-200">
                        <div className="flex gap-2">
                          <textarea
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Type your reply..."
                            rows="2"
                            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                          />
                          <button
                            onClick={handleSendReply}
                            disabled={!replyText.trim() || replying}
                            className="px-6 py-3 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                          >
                            {replying ? 'Sending...' : 'Send'}
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-500">
                      <div className="text-center">
                        <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <p>Select a conversation to view messages</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
