import React, { useEffect, useState, useRef } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useSocket } from '../../../context/SocketContext';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../services/api';
import { Send, FileText, AlertCircle, ShieldCheck, ShieldQuestion, X } from 'lucide-react';
import Swal from 'sweetalert2';
import { motion } from 'framer-motion';
import ItemLinkPreview from '../components/ItemLinkPreview';
import HandoverBanner from '../components/HandoverBanner';
import Dialog from '../../../components/common/Dialog';
import PageNavigation from '../../../components/common/PageNavigation';
import toast from 'react-hot-toast';
interface Message {
  _id: string;
  senderId: any;
  receiverId: any;
  text: string;
  createdAt: string;
}

const ChatPage: React.FC = () => {
  const { itemId, otherUserId } = useParams<{ itemId: string; otherUserId: string }>();
  const { socket } = useSocket();
  const { user, loading: authLoading } = useAuth();
  const route = useLocation();
  const [loadError, setLoadError] = useState(false);
  const [retry, setRetry] = useState(0);

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [receiverId, setReceiverId] = useState<string | null>(null);
  const [receiverName, setReceiverName] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Digital Proof of Ownership Claim States
  const [item, setItem] = useState<any>(null);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [verificationInputs, setVerificationInputs] = useState<Record<string, string>>({});
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'instant'
        : 'smooth',
    });
  };

  useEffect(() => {
    let active = true;
    const initChat = async () => {
      setLoading(true);
      setLoadError(false);
      try {
        // Fetch Item data containing the original createdBy poster ID
        const itemRes = await api.get(`/items/${itemId}`);
        if (!active) return;
        setItem(itemRes.data);
        const posterId = itemRes.data.createdBy._id || itemRes.data.createdBy;
        setReceiverId(posterId);

        // Fetch historical logs from MongoDB
        const msgRes = await api.get(`/messages/${itemId}/${otherUserId}`);
        if (!active) return;
        const fetchedMessages = msgRes.data;
        setMessages(fetchedMessages);

        setReceiverId(otherUserId || null);

        // Dynamically determine the correct receiverName
        let computedReceiverName = itemRes.data.createdBy.username || 'User';
        if (user && fetchedMessages.length > 0) {
          const relevantMsg = fetchedMessages.find(
            (m: any) =>
              (m.senderId && (m.senderId._id || m.senderId) === user._id) ||
              (m.receiverId && (m.receiverId._id || m.receiverId) === user._id)
          );
          if (relevantMsg) {
            const sender = relevantMsg.senderId;
            const receiver = relevantMsg.receiverId;
            const senderIdStr = sender._id || sender;
            const receiverIdStr = receiver._id || receiver;

            if (senderIdStr === user._id) {
              computedReceiverName = receiver.username || computedReceiverName;
            } else {
              computedReceiverName = sender.username || computedReceiverName;
            }
          }
        }
        setReceiverName(computedReceiverName);
      } catch (error) {
        if (active) setLoadError(true);
      } finally {
        if (active) setLoading(false);
      }
    };
    if (itemId && user?._id) initChat();
    return () => {
      active = false;
    };
  }, [itemId, otherUserId, user?._id, retry]);

  // Hook into WebSocket Real-Time Broadcasts
  useEffect(() => {
    if (socket && itemId && otherUserId && user) {
      // Create deterministic room ID sorting both user IDs so both users join the same channel
      const roomId = [user._id, otherUserId].sort().join('_') + '_' + itemId;

      // Fire immediately (will buffer if not connected)
      const joinRoom = () =>
        socket.emit('join_room', roomId, (result: { ok: boolean; message?: string }) => {
          if (!result.ok) toast.error(result.message || 'Unable to join conversation');
        });
      joinRoom();

      // Crucial: Re-join room automatically if socket drops and reconnects
      const onConnect = joinRoom;
      socket.on('connect', onConnect);

      socket.on('receive_message', (newMessage: Message) => {
        setMessages((prev) => {
          // Prevent duplicates or misdirected messages from other rooms
          if (newMessage.senderId !== otherUserId && newMessage.senderId !== user._id) return prev;
          if (newMessage.receiverId !== otherUserId && newMessage.receiverId !== user._id)
            return prev;
          if (prev.some((msg) => msg._id === newMessage._id)) return prev;
          return [...prev, newMessage];
        });
      });

      return () => {
        socket.emit('leave_room', roomId);
        socket.off('connect', onConnect);
        socket.off('receive_message');
      };
    }
  }, [socket, itemId, otherUserId, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim() && socket && itemId && receiverId && !isSending) {
      const messageData = {
        itemId,
        receiverId,
        text: inputText,
      };

      // Dispatch securely over Socket connection
      setIsSending(true);
      socket
        .timeout(10000)
        .emit(
          'send_message',
          messageData,
          (error: Error | null, result: { ok: boolean; message?: string }) => {
            setIsSending(false);
            if (error || !result?.ok) {
              toast.error(
                error
                  ? 'Message confirmation timed out. Check the conversation before retrying.'
                  : result.message || 'Unable to send message'
              );
              return;
            }
            setInputText((current) => (current === messageData.text ? '' : current));
          }
        );
    }
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item || !item.ownershipProofs) return;

    setIsVerifying(true);
    setVerificationError('');
    try {
      const submittedProofs = item.ownershipProofs
        .map((p: any) => ({
          proofType: p.proofType,
          customLabel: p.customLabel,
          proofValue: verificationInputs[p._id] || '',
        }))
        .filter((proof: { proofValue: string }) => proof.proofValue.trim());

      const res = await api.post(`/items/${itemId}/verify-ownership`, { submittedProofs });

      const { status: overallStatus, scorePercentage, verifiedCount, totalProofs } = res.data;

      Swal.fire({
        title:
          overallStatus === 'VERIFIED'
            ? 'Verification Successful!'
            : overallStatus === 'PARTIALLY_VERIFIED'
              ? 'Partial Verification'
              : 'Verification Failed',
        text: `Match score: ${scorePercentage}% (${verifiedCount} of ${totalProofs} fields matched).`,
        icon:
          overallStatus === 'VERIFIED'
            ? 'success'
            : overallStatus === 'PARTIALLY_VERIFIED'
              ? 'warning'
              : 'error',
        confirmButtonColor: '#800000',
      });

      setIsVerificationModalOpen(false);
      setVerificationInputs({});

      // Re-fetch item data and messages
      const itemRes = await api.get(`/items/${itemId}`);
      setItem(itemRes.data);

      const msgRes = await api.get(`/messages/${itemId}/${otherUserId}`);
      setMessages(msgRes.data);
    } catch (err: any) {
      setVerificationError(err.response?.data?.message || 'Verification failed. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const downloadPolicePDF = async () => {
    try {
      // Trigger express PDF generation endpoint returning a Blob
      const response = await api.get(`/items/${itemId}/download-pdf`, { responseType: 'blob' });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Handover_Declaration_${itemId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (error) {
      console.error('Failed to download PDF', error);
    }
  };

  // The claimant is always the person who did NOT create the post.
  const isClaimant = item && (item.createdBy?._id || item.createdBy) !== user?._id;

  // Check if chat should be locked
  const lastVerification = item?.verificationHistory?.[item?.verificationHistory?.length - 1];
  const isVerified =
    lastVerification &&
    (lastVerification.overallStatus === 'VERIFIED' ||
      lastVerification.overallStatus === 'PARTIALLY_VERIFIED');

  // We no longer lock the chat based on user feedback. The system allows free chat, but keeps the verification badge.
  const isChatLocked = false;
  const isOwnerLocked = false;

  if (authLoading)
    return (
      <p role="status" className="ui-muted p-10 text-center">
        Loading your account…
      </p>
    );
  if (!user)
    return (
      <section className="ui-panel mx-auto max-w-lg p-8">
        <h1 className="text-xl font-bold">Sign in to continue this conversation</h1>
        <Link to="/login" state={{ from: route.pathname }} className="ui-primary mt-4">
          Sign in
        </Link>
      </section>
    );
  if (loadError)
    return (
      <section role="alert" className="ui-panel mx-auto max-w-lg p-8">
        <h1 className="text-xl font-bold">This conversation could not be loaded</h1>
        <p className="ui-muted my-3">
          Check your connection and that this conversation is available to your account.
        </p>
        <button className="ui-primary" onClick={() => setRetry((value) => value + 1)}>
          Try again
        </button>
      </section>
    );
  if (loading)
    return (
      <p role="status" className="ui-muted p-10 text-center">
        Loading conversation…
      </p>
    );

  return (
    <>
      <PageNavigation />
      <div className="max-w-4xl mx-auto bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col min-h-[36rem] h-[calc(100dvh-10rem)]">
        {/* Header & Warning Context */}
        <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-900/50 rounded-t-2xl">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-brand-700 text-white rounded-full flex items-center justify-center font-bold text-lg shadow-sm">
              {receiverName ? receiverName.charAt(0).toUpperCase() : '?'}
            </div>
            <div>
              <h1 className="font-bold text-gray-900 dark:text-gray-100 leading-tight">
                {receiverName || 'Conversation'}
              </h1>
              <p className="text-xs text-emerald-600 font-medium flex items-center mt-0.5 dark:text-emerald-300">
                <ShieldCheck className="mr-1.5 h-3 w-3" />
                Private conversation
              </p>
            </div>
          </div>

          <button
            onClick={downloadPolicePDF}
            aria-label="Download handover PDF"
            className="flex items-center space-x-2 bg-gray-900 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-all shadow-sm"
          >
            <FileText className="w-4 h-4" />
            <span className="hidden sm:block">Export Police PDF</span>
          </button>
        </div>

        {/* Verification status banner */}
        {item && item.ownershipProofs && item.ownershipProofs.length > 0 && (
          <div
            className={`border-b border-gray-100 p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0 ${isVerified ? 'bg-green-50 dark:bg-green-900/20' : 'bg-amber-50 dark:bg-amber-900/20'}`}
          >
            <div className="text-xs text-gray-700 dark:text-gray-300">
              <span
                className={`font-bold uppercase block mb-1 ${isVerified ? 'text-green-700 dark:text-green-400' : 'text-amber-700 dark:text-amber-400'}`}
              >
                <ShieldQuestion className="w-3 h-3 inline mr-1" />
                Ownership details {isVerified ? '(Verified)' : '(Not yet verified)'}
              </span>
              This item has {item.ownershipProofs.length} private ownership detail(s) registered.
              {item.verificationHistory && item.verificationHistory.length > 0 ? (
                <span className="ui-muted block mt-1">
                  Last attempt:{' '}
                  <strong
                    className={
                      isVerified
                        ? 'text-green-700 dark:text-green-300'
                        : 'text-red-600 dark:text-red-300'
                    }
                  >
                    {item.verificationHistory[item.verificationHistory.length - 1].overallStatus ===
                    'VERIFIED'
                      ? 'Verified'
                      : item.verificationHistory[item.verificationHistory.length - 1]
                            .overallStatus === 'PARTIALLY_VERIFIED'
                        ? 'Partially verified'
                        : 'Not verified'}{' '}
                    ({item.verificationHistory[item.verificationHistory.length - 1].scorePercentage}
                    % Match)
                  </strong>
                </span>
              ) : (
                <span className="ui-muted block mt-1">
                  No verification attempts have been made yet.
                </span>
              )}
            </div>
            {isClaimant && !isVerified && (
              <button
                onClick={() => {
                  setVerificationError('');
                  setIsVerificationModalOpen(true);
                }}
                className="ui-primary"
              >
                Verify item details
              </button>
            )}
          </div>
        )}

        {/* Handover Verification Engine */}
        {receiverId && itemId && <HandoverBanner itemId={itemId} otherUserId={receiverId} />}

        {/* Message Feed Canvas */}
        <div className="flex-grow p-6 overflow-y-auto bg-[#F9FAFB]/60 dark:bg-slate-900/40 space-y-4 relative">
          {messages.length === 0 ? (
            <div className="text-center text-gray-400 mt-20 text-sm font-medium dark:text-slate-400">
              No messages yet. Start by describing the item or asking a question.
            </div>
          ) : (
            messages.map((msg, index) => {
              const senderIdStr = msg.senderId?._id || msg.senderId;
              // Correct alignment logic mapping for UI
              const alignRight = senderIdStr === user?._id;

              // Detect Item Links (e.g., /items/6a1409a94e364baf912eb68b)
              const itemRegex = /\/items\/([a-fA-F0-9]{24})/;
              const match = msg.text.match(itemRegex);
              const extractedItemId = match ? match[1] : null;

              // Date separator logic
              const msgDate = new Date(msg.createdAt || Date.now());
              const prevMsgDate =
                index > 0 ? new Date(messages[index - 1].createdAt || Date.now()) : null;

              let showDateHeader = false;
              let dateHeaderText = '';

              if (!prevMsgDate || msgDate.toDateString() !== prevMsgDate.toDateString()) {
                showDateHeader = true;
                const today = new Date();
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);

                if (msgDate.toDateString() === today.toDateString()) {
                  dateHeaderText = 'Today';
                } else if (msgDate.toDateString() === yesterday.toDateString()) {
                  dateHeaderText = 'Yesterday';
                } else {
                  dateHeaderText = msgDate.toLocaleDateString([], {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  });
                }
              }

              return (
                <React.Fragment key={msg._id || index}>
                  {showDateHeader && (
                    <div className="flex justify-center my-4">
                      <span className="bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-gray-300 text-xs px-3 py-1 rounded-full font-medium shadow-sm">
                        {dateHeaderText}
                      </span>
                    </div>
                  )}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${alignRight ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] sm:max-w-[75%] px-5 py-3.5 shadow-sm text-sm ${
                        alignRight
                          ? 'bg-brand-700 text-white rounded-2xl rounded-br-sm'
                          : 'bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 text-gray-800 dark:text-gray-200 rounded-2xl rounded-bl-sm'
                      }`}
                    >
                      {/* Render Text */}
                      <span className="whitespace-pre-wrap">{msg.text}</span>

                      {/* WhatsApp-style Rich Link Preview */}
                      {extractedItemId && (
                        <ItemLinkPreview itemId={extractedItemId} alignRight={alignRight} />
                      )}

                      <div
                        className={`text-[10px] mt-1.5 text-right font-medium ${alignRight ? 'text-white/60' : 'text-gray-400'}`}
                      >
                        {msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </motion.div>
                </React.Fragment>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Persistent Message Input Engine */}
        <div className="p-4 bg-white dark:bg-slate-800 border-t border-gray-100 dark:border-slate-700 rounded-b-2xl relative">
          <form onSubmit={sendMessage} className="flex space-x-3 items-end">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(e);
                }
              }}
              placeholder="Write a message…"
              className="ui-field min-w-0 flex-1 resize-none"
              aria-label="Message"
              rows={2}
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isSending || !socket?.connected}
              aria-label={isSending ? 'Sending message' : 'Send message'}
              className="p-3 bg-brand-700 text-white rounded-xl hover:bg-brand-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-brand-700/20 flex items-center justify-center h-12 w-12 flex-shrink-0"
            >
              <Send className="w-5 h-5 ml-0.5" />
            </button>
          </form>
        </div>

        {/* Verification Modal */}
        {isVerificationModalOpen && item && item.ownershipProofs && (
          <Dialog titleId="verification-title" onClose={() => setIsVerificationModalOpen(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative p-6"
            >
              <button
                onClick={() => setIsVerificationModalOpen(false)}
                aria-label="Close verification"
                className="ui-quiet absolute right-2 top-2"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center space-x-2.5 mb-4">
                <div className="bg-brand-700/10 p-2 rounded-xl">
                  <ShieldCheck className="w-6 h-6 text-brand-700 dark:text-brand-300" />
                </div>
                <div>
                  <h3 id="verification-title" className="pr-6 text-lg font-bold">
                    Verify ownership
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    Provide details matching the registered proofs
                  </p>
                </div>
              </div>

              <form onSubmit={handleVerifySubmit} aria-busy={isVerifying} className="space-y-4">
                {verificationError && (
                  <p
                    role="alert"
                    className="rounded-xl bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200"
                  >
                    {verificationError}
                  </p>
                )}
                <div className="max-h-[300px] overflow-y-auto pr-1 space-y-3.5">
                  {item.ownershipProofs.map((proof: any) => {
                    const label =
                      proof.proofType === 'custom'
                        ? proof.customLabel
                        : proof.proofType
                            .replace(/([A-Z])/g, ' $1')
                            .replace(/^./, (str: string) => str.toUpperCase());
                    return (
                      <div key={proof._id} className="space-y-1">
                        <label htmlFor={'proof-' + proof._id} className="ui-label">
                          {label}
                        </label>
                        <input
                          id={'proof-' + proof._id}
                          required
                          type="text"
                          placeholder={`Enter ${label.toLowerCase()}...`}
                          value={verificationInputs[proof._id] || ''}
                          onChange={(e) =>
                            setVerificationInputs((prev) => ({
                              ...prev,
                              [proof._id]: e.target.value,
                            }))
                          }
                          className="ui-field"
                        />
                      </div>
                    );
                  })}
                </div>

                <div className="flex space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsVerificationModalOpen(false)}
                    className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition text-sm font-semibold dark:border-slate-700 dark:text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isVerifying}
                    className="flex-1 px-4 py-2.5 bg-brand-700 text-white rounded-xl hover:bg-brand-800 transition text-sm font-semibold disabled:opacity-75"
                  >
                    {isVerifying ? 'Verifying...' : 'Submit Proof'}
                  </button>
                </div>
              </form>
            </motion.div>
          </Dialog>
        )}
      </div>
    </>
  );
};

export default ChatPage;
