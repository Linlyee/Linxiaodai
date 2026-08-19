import { FormEvent, type ComponentType, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BatteryCharging,
  Bookmark,
  CalendarDays,
  ChefHat,
  CheckCircle2,
  Clock3,
  Compass,
  Copy,
  CreditCard,
  Crown,
  DoorOpen,
  Eye,
  EyeOff,
  Flame,
  Gift,
  Heart,
  Headphones,
  History,
  LockKeyhole,
  LogOut,
  MessageSquarePlus,
  MessageCircle,
  Meh,
  PackageCheck,
  RotateCcw,
  Smile,
  Salad,
  Send,
  Share2,
  ShoppingCart,
  Sparkles,
  Star,
  Store,
  Trash2,
  Soup,
  SlidersHorizontal,
  ThumbsDown,
  ThumbsUp,
  Trophy,
  UserRoundPlus,
  UtensilsCrossed,
  UsersRound,
  Vote,
  Zap,
  X,
} from 'lucide-react';
import { api } from './api';
import type {
  CartItem,
  ChatMessage,
  ConversationSummary,
  DiningRoom,
  ExtractedRequirements,
  Order,
  RecommendationResult,
  ProviderSource,
  Restaurant,
  SavedMeal,
  SavedMealOccasion,
  UserProfile,
  MealMood,
  TasteProfile,
  TastePassport,
  WeeklyTasteRecap,
  TasteTag,
} from './types';

const spiceLabel: Record<string, string> = { none: '不辣', mild: '微辣', medium: '中辣', hot: '重辣' };
const statusLabel: Record<string, string> = {
  pending_payment: '待支付', paid: '待渠道确认', accepted: '渠道已确认', preparing: '制作中',
  ready_for_pickup: '待配送', picked_up: '骑手已取餐', delivering: '配送中', completed: '已完成', cancelled: '已取消',
};
type AppetiteAnswer = 'recharge' | 'reward' | 'explore' | 'solo' | 'together' | 'fast' | 'spicy' | 'comfort' | 'fresh';

interface AppetiteProfile {
  key: string;
  icon: ComponentType<{ size?: number; strokeWidth?: number }>;
  name: string;
  tagline: string;
  note: string;
  className: string;
  requirements: ExtractedRequirements;
}

const appetiteQuestions: Array<{ eyebrow: string; title: string; options: Array<{ value: AppetiteAnswer; icon: ComponentType<{ size?: number; strokeWidth?: number }>; label: string; hint: string }> }> = [
  { eyebrow: '01 · 此刻状态', title: '这一餐，想给自己什么？', options: [
    { value: 'recharge', icon: BatteryCharging, label: '原地回血', hint: '需要一份踏实的能量' },
    { value: 'reward', icon: Sparkles, label: '认真犒赏', hint: '今天值得吃点好的' },
    { value: 'explore', icon: Compass, label: '味觉出逃', hint: '想尝试一点新鲜感' },
  ] },
  { eyebrow: '02 · 用餐场景', title: '今天的饭桌是什么气氛？', options: [
    { value: 'solo', icon: Headphones, label: '自在独处', hint: '一个人也要好好吃饭' },
    { value: 'together', icon: UsersRound, label: '一起热闹', hint: '适合分享才最开心' },
    { value: 'fast', icon: Zap, label: '速战速决', hint: '快一点，也别将就' },
  ] },
  { eyebrow: '03 · 味觉直觉', title: '不要思考，第一口想要？', options: [
    { value: 'spicy', icon: Flame, label: '热烈上头', hint: '香辣过瘾，越吃越来劲' },
    { value: 'comfort', icon: Soup, label: '温暖满足', hint: '熟悉的味道最能治愈' },
    { value: 'fresh', icon: Salad, label: '清爽轻盈', hint: '吃完舒服，没有负担' },
  ] },
];

export function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authError, setAuthError] = useState('');
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    api.me().then(setUser).catch(() => setUser(null)).finally(() => setIsCheckingSession(false));
  }, []);

  const logout = async () => {
    await api.logout().catch(() => undefined);
    setUser(null);
  };

  const handleAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setAuthError('');
    setIsAuthenticating(true);
    try {
      const email = String(form.get('email') || '');
      const password = String(form.get('password') || '');
      const profile = authMode === 'login'
        ? await api.login(email, password)
        : await api.register(String(form.get('name') || ''), email, password);
      setUser(profile);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : '登录失败，请稍后重试');
    } finally { setIsAuthenticating(false); }
  };

  if (isCheckingSession) return <main className="session-loading" aria-busy="true"><div className="brand-mark"><ChefHat size={24} /></div><span>正在准备今天的好味道</span><i /></main>;
  if (!user) return <AuthScreen mode={authMode} setMode={setAuthMode} error={authError} isSubmitting={isAuthenticating} onSubmit={handleAuth} />;
  return <CustomerWorkspace user={user} onLogout={logout} />;
}

function AuthScreen({ mode, setMode, error, isSubmitting, onSubmit }: {
  mode: 'login' | 'register'; setMode: (mode: 'login' | 'register') => void; error: string; isSubmitting: boolean; onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const [showPassword, setShowPassword] = useState(false);
  return <main className="auth-screen">
    <section className="auth-copy">
      <div className="brand-lockup"><div className="brand-mark"><ChefHat size={24} /></div><span>LIN XIAODAI · AI DINING</span></div>
      <p className="auth-kicker">今晚，吃点刚刚好的。</p>
      <h1>让每一餐，<br /><em>少一点纠结。</em></h1>
      <p className="auth-intro">说出预算、餐别和你最在意的条件，小呆会从已连接的外卖渠道中挑出当前最值得吃的商品。</p>
      <div className="auth-stats"><span><Sparkles size={15} />智能匹配</span><span><Clock3 size={15} />省时决策</span><span><Store size={15} />多源商品</span></div>
    </section>
    <form className="auth-card" onSubmit={onSubmit}>
      <div className="auth-card-heading"><span>{mode === 'login' ? 'WELCOME BACK' : 'JOIN US'}</span><h2>{mode === 'login' ? '欢迎回来' : '创建账户'}</h2><p>{mode === 'login' ? '登录后继续探索今天的好味道' : '从今天开始，把选择交给小呆'}</p></div>
      <div className="auth-switch"><button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>登录</button><button type="button" className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>注册</button></div>
      {mode === 'register' && <label htmlFor="auth-name">昵称<input id="auth-name" name="name" autoComplete="name" placeholder="例如：林小呆" required /></label>}
      <label htmlFor="auth-email">邮箱地址<input id="auth-email" name="email" type="email" autoComplete="email" defaultValue="demo@linxiaodai.com" placeholder="name@example.com" required /></label>
      <div className="auth-field"><label htmlFor="auth-password">密码</label><div className="password-field"><input id="auth-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} defaultValue="demo123" minLength={6} placeholder="至少 6 位字符" required /><button type="button" aria-label={showPassword ? '隐藏输入内容' : '显示输入内容'} onClick={() => setShowPassword(value => !value)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="primary-button auth-submit" type="submit" disabled={isSubmitting}>{isSubmitting ? '正在登录…' : mode === 'login' ? '进入林小呆' : '注册并开始'}<span>{isSubmitting ? <i className="button-spinner" /> : '→'}</span></button>
      <div className="demo-accounts"><span>用户演示账号</span><p>demo@linxiaodai.com</p><small>密码：demo123</small></div>
    </form>
  </main>;
}

function CustomerWorkspace({ user, onLogout }: { user: UserProfile; onLogout: () => void }) {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [requirements, setRequirements] = useState<ExtractedRequirements>({});
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [providers, setProviders] = useState<ProviderSource[]>([]);
  const [cart, setCart] = useState<CartItem[]>(() => loadSavedCart(user.id));
  const [orders, setOrders] = useState<Order[]>([]);
  const [tasteProfile, setTasteProfile] = useState<TasteProfile | null>(null);
  const [tastePassport, setTastePassport] = useState<TastePassport | null>(null);
  const [weeklyRecap, setWeeklyRecap] = useState<WeeklyTasteRecap | null>(null);
  const [savedMeals, setSavedMeals] = useState<SavedMeal[]>([]);
  const [activePanel, setActivePanel] = useState<'requirements' | 'saved' | 'cart' | 'orders'>('requirements');
  const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState(() => localStorage.getItem(`linxiaodai:address:${user.id}`) || '');
  const [orderNote, setOrderNote] = useState('');
  const [diningRoomOpen, setDiningRoomOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [toast, setToast] = useState('');
  const [toastUndo, setToastUndo] = useState<(() => Promise<void>) | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const passportReadyRef = useRef(false);

  const showToast = (message: string) => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    setToast(message);
    setToastUndo(null);
    toastTimerRef.current = window.setTimeout(() => { setToast(''); setToastUndo(null); }, 2400);
  };
  const showToastWithUndo = (message: string, undo: () => Promise<void>) => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    setToast(message); setToastUndo(() => undo);
    toastTimerRef.current = window.setTimeout(() => { setToast(''); setToastUndo(null); }, 5000);
  };
  const refreshConversations = () => api.conversations().then(setConversations).catch(() => setConversations([]));
  const refreshOrders = () => api.orders().then(setOrders).catch(() => setOrders([]));
  const refreshTastePassport = () => api.tastePassport().then(next => {
    const storageKey = `linxiaodai:passport-seen:${user.id}`;
    const unlocked = next.stamps.filter(stamp => stamp.unlocked).map(stamp => stamp.cuisine);
    let seen: string[] = [];
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) || '[]');
      seen = Array.isArray(stored) ? stored.filter(value => typeof value === 'string') : [];
    } catch { localStorage.removeItem(storageKey); }
    const newlyUnlocked = unlocked.find(cuisine => !seen.includes(cuisine));
    setTastePassport(next);
    localStorage.setItem(storageKey, JSON.stringify(unlocked));
    if ((passportReadyRef.current || seen.length > 0) && newlyUnlocked) {
      showToast(`新印章解锁 · ${newlyUnlocked}！味觉护照又多了一站`);
      if (navigator.vibrate) navigator.vibrate([12, 40, 18]);
    }
    passportReadyRef.current = true;
  }).catch(() => setTastePassport(null));
  const refreshWeeklyRecap = () => api.weeklyTasteRecap().then(setWeeklyRecap).catch(() => setWeeklyRecap(null));
  const refreshSavedMeals = () => api.savedMeals().then(setSavedMeals).catch(() => setSavedMeals([]));

  useEffect(() => {
    api.restaurants().then(setRestaurants).catch(() => setRestaurants([]));
    api.providers().then(setProviders).catch(() => setProviders([]));
    refreshConversations();
    refreshOrders();
    api.tasteProfile().then(setTasteProfile).catch(() => setTasteProfile(null));
    refreshTastePassport();
    refreshWeeklyRecap();
    refreshSavedMeals();
  }, []);

  useEffect(() => {
    localStorage.setItem(`linxiaodai:cart:${user.id}`, JSON.stringify(cart));
  }, [cart, user.id]);

  useEffect(() => {
    if (!orders.some(order => !['completed', 'cancelled'].includes(order.status))) return;
    const timer = window.setInterval(refreshOrders, 15000);
    return () => window.clearInterval(timer);
  }, [orders]);

  const completedOrderCount = orders.filter(order => order.status === 'completed').length;
  useEffect(() => { if (orders.length > 0) { refreshTastePassport(); refreshWeeklyRecap(); } }, [completedOrderCount]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || isSending) return;
    setMessages(previous => [...previous, { id: crypto.randomUUID(), role: 'user', content, createdAt: new Date().toISOString() }]);
    setIsSending(true);
    try {
      const result = await api.sendMessage(content, conversationId);
      setConversationId(result.conversationId);
      setMessages(previous => [...previous, result.message]);
      setRequirements(result.extractedRequirements);
      refreshConversations();
    } catch (error) {
      showToast(error instanceof Error ? error.message : '消息发送失败');
    } finally { setIsSending(false); }
  };

  const loadConversation = async (id: string) => {
    try {
      const detail = await api.conversation(id);
      setConversationId(id); setMessages(detail.messages); setRequirements(detail.extractedRequirements || {});
    } catch { showToast('读取对话失败'); }
  };

  const addToCart = (recommendation: RecommendationResult, index = 0) => {
    const menuItem = recommendation.menuItems[index];
    if (!menuItem) return;
    const changedRestaurant = cart.length > 0 && cart[0].restaurant.id !== recommendation.restaurant.id;
    setCart(previous => {
      const sameRestaurant = previous.length === 0 || previous[0].restaurant.id === recommendation.restaurant.id;
      const base = sameRestaurant ? previous : [];
      const existing = base.find(line => line.menuItem.id === menuItem.id);
      return existing
        ? base.map(line => line.menuItem.id === menuItem.id ? { ...line, quantity: line.quantity + 1 } : line)
        : [...base, { id: crypto.randomUUID(), menuItem, restaurant: recommendation.restaurant, quantity: 1 }];
    });
    setActivePanel('cart');
    showToast(changedRestaurant ? `已切换到 ${recommendation.restaurant.name} 的购物车` : '已加入购物车');
  };

  const saveRecommendation = async (recommendation: RecommendationResult) => {
    try {
      const saved = await api.saveMeal(recommendation);
      setSavedMeals(previous => previous.some(item => item.id === saved.id) ? previous : [saved, ...previous]);
      showToast('整套搭配已收藏 · 以后想吃可以一键找回');
      if (navigator.vibrate) navigator.vibrate(10);
    } catch (error) { showToast(error instanceof Error ? error.message : '收藏没有保存，请重试'); }
  };

  const reorderSavedMeal = (saved: SavedMeal) => {
    if (!saved.restaurant || !saved.isAvailable) { showToast('这套搭配暂时无法完整回购'); return; }
    setCart(saved.menuItems.map(menuItem => ({ id: crypto.randomUUID(), menuItem, restaurant: saved.restaurant!, quantity: 1 })));
    setActivePanel('cart'); setIsMobilePanelOpen(true);
    showToast(saved.priceChanged ? `已按当前价格加入购物车 · ¥${saved.currentTotal}` : '整套搭配已加入购物车');
  };

  const updateCartQuantity = (id: string, quantity: number) => {
    setCart(previous => quantity <= 0
      ? previous.filter(line => line.id !== id)
      : previous.map(line => line.id === id ? { ...line, quantity: Math.min(quantity, 20) } : line));
  };

  const openBlindBox = async (nextRequirements: ExtractedRequirements = requirements) => {
    try {
      const result = await api.blindBox(nextRequirements);
      setRequirements(nextRequirements);
      setMessages(previous => [...previous, { id: crypto.randomUUID(), role: 'assistant', content: `盲盒已打开：今天试试 ${result.recommendation.restaurant.name}。${result.recommendation.reason}`, recommendations: [result.recommendation], blindBoxId: result.boxId, createdAt: new Date().toISOString() }]);
    } catch (error) { showToast(error instanceof Error ? error.message : '盲盒暂时打不开'); }
  };

  const sendBlindBoxFeedback = async (boxId: string, action: 'liked' | 'disliked' | 'reopened' | 'platform_opened') => {
    try {
      await api.blindBoxFeedback(boxId, action);
      showToast(action === 'liked' ? '收到，之后会多推荐这一类。' : action === 'disliked' ? '收到，之后会减少这一类推荐。' : '已记录，你可以继续开一个。');
    } catch { showToast('反馈暂未保存，请稍后重试。'); }
  };

  const createOrder = async () => {
    const address = deliveryAddress.trim();
    if (!address) {
      showToast('请先填写配送地址');
      return;
    }
    try {
      const order = await api.createOrder(cart, address, orderNote.trim());
      localStorage.setItem(`linxiaodai:address:${user.id}`, address);
      setCart([]); setOrders(previous => [order, ...previous]); setActivePanel('orders');
      setOrderNote('');
      showToast('订单已创建，请完成演示支付');
    } catch (error) { showToast(error instanceof Error ? error.message : '下单失败'); }
  };

  const updateOrder = async (id: string, action: 'pay' | 'cancel') => {
    try {
      const updated = action === 'pay' ? await api.payOrder(id) : await api.cancelOrder(id);
      setOrders(previous => previous.map(order => order.id === id ? updated : order));
      showToast(action === 'pay' ? '演示支付完成，履约进度将自动更新' : '订单已取消');
    } catch (error) { showToast(error instanceof Error ? error.message : '订单操作失败'); }
  };

  const saveReflection = async (id: string, mood: MealMood, tags: TasteTag[], note: string) => {
    const result = await api.saveMealReflection(id, mood, tags, note);
    setOrders(previous => previous.map(order => order.id === id ? result.order : order));
    setTasteProfile(result.tasteProfile);
    refreshTastePassport();
    refreshWeeklyRecap();
    showToast(`回味已收好 · 你的味觉等级是 Lv.${result.tasteProfile.level}`);
  };

  const openPanel = (panel: 'requirements' | 'saved' | 'cart' | 'orders') => { setActivePanel(panel); setIsMobilePanelOpen(true); };
  const activeOrderCount = orders.filter(order => !['completed', 'cancelled'].includes(order.status)).length;

  return <div className="app-shell">
    <a className="skip-link" href="#main-content">跳到主要内容</a>
    <aside className="sidebar" aria-label="对话导航">
      <div className="sidebar-brand"><div className="brand-mark small"><ChefHat size={19} /></div><div><strong>林小呆</strong><span>AI DINING</span></div></div>
      <button className="new-chat" onClick={() => { setConversationId(null); setMessages([]); setRequirements({}); }}><MessageSquarePlus size={17} />开启新对话</button>
      <div className="side-content">
        <h3 className="side-heading"><History size={14} />最近对话</h3>
        {conversations.length ? conversations.map(conversation => <button className="conversation-item" key={conversation.id} onClick={() => loadConversation(conversation.id)}><strong>{conversation.title}</strong><span>{new Date(conversation.updatedAt).toLocaleString('zh-CN')}</span></button>) : <EmptyState title="还没有对话" description="告诉小呆你今天想吃什么。" />}
      </div>
      <div className="profile-card"><div className="profile-avatar">{user.name.slice(0, 1)}</div><div><strong>{user.name}</strong><span>{user.email}</span></div><button className="logout-icon" title="退出登录" onClick={onLogout}><LogOut size={16} /></button></div>
    </aside>
    <ChatWorkspace messages={messages} requirements={requirements} restaurantCount={restaurants.length} savedMeals={savedMeals} isSending={isSending} onSend={sendMessage} onBlindBox={openBlindBox} onAddToCart={addToCart} onSaveMeal={saveRecommendation} onFeedback={sendBlindBoxFeedback} />
    <button className="dining-room-fab" onClick={() => setDiningRoomOpen(true)}><UsersRound size={18} /><span>和饭搭子一起选</span></button>
    <aside className={`right-panel ${isMobilePanelOpen ? 'panel-open' : ''}`} aria-label="点餐详情">
      <button className="mobile-panel-close" aria-label="关闭详情面板" onClick={() => setIsMobilePanelOpen(false)}><X size={20} /></button>
      <div className="panel-tabs"><button className={activePanel === 'requirements' ? 'active' : ''} onClick={() => setActivePanel('requirements')}><Sparkles size={16} />偏好</button><button className={activePanel === 'saved' ? 'active' : ''} onClick={() => setActivePanel('saved')}><Bookmark size={16} />收藏{savedMeals.length > 0 && <b>{savedMeals.length}</b>}</button><button className={activePanel === 'cart' ? 'active' : ''} onClick={() => setActivePanel('cart')}><ShoppingCart size={16} />购物车{cart.length > 0 && <b>{cart.reduce((sum, item) => sum + item.quantity, 0)}</b>}</button><button className={activePanel === 'orders' ? 'active' : ''} onClick={() => setActivePanel('orders')}><PackageCheck size={16} />订单{activeOrderCount > 0 && <b>{activeOrderCount}</b>}</button></div>
      {activePanel === 'requirements' && <DecisionPanel requirements={requirements} providers={providers} />}
      {activePanel === 'saved' && <SavedMealsPanel items={savedMeals} onReorder={reorderSavedMeal} onUpdate={async (id, patch) => { try { const updated = await api.updateSavedMeal(id, patch); setSavedMeals(previous => previous.map(item => item.id === id ? updated : item)); } catch (error) { showToast(error instanceof Error ? error.message : '收藏更新失败，请重试'); } }} onDelete={async id => { const removed = savedMeals.find(item => item.id === id); if (!removed) return; try { await api.deleteSavedMeal(id); setSavedMeals(previous => previous.filter(item => item.id !== id)); showToastWithUndo('已移出收藏夹', async () => { const restored = await api.updateSavedMeal(id, { restore: true }); setSavedMeals(previous => [restored, ...previous.filter(item => item.id !== restored.id)]); }); } catch (error) { showToast(error instanceof Error ? error.message : '删除失败，请检查网络后重试'); } }} />}
      {activePanel === 'cart' && <CartPanel items={cart} address={deliveryAddress} note={orderNote} onAddressChange={setDeliveryAddress} onNoteChange={setOrderNote} onQuantityChange={updateCartQuantity} onCheckout={createOrder} />}
      {activePanel === 'orders' && <OrdersPanel orders={orders} tasteProfile={tasteProfile} tastePassport={tastePassport} weeklyRecap={weeklyRecap} onStartPrompt={prompt => { setIsMobilePanelOpen(false); sendMessage(prompt); }} onExploreCuisine={cuisine => { setIsMobilePanelOpen(false); sendMessage(`今天想解锁味觉护照里的${cuisine}印章，请推荐一餐`); }} onOrderAction={updateOrder} onSaveReflection={saveReflection} />}
    </aside>
    {isMobilePanelOpen && <button className="mobile-panel-scrim" aria-label="关闭详情面板" onClick={() => setIsMobilePanelOpen(false)} />}
    <nav className="mobile-nav" aria-label="主要导航"><button className={!isMobilePanelOpen ? 'active' : ''} onClick={() => setIsMobilePanelOpen(false)}><MessageCircle size={20} />对话</button><button className={isMobilePanelOpen && activePanel === 'requirements' ? 'active' : ''} onClick={() => openPanel('requirements')}><SlidersHorizontal size={20} />偏好</button><button className={isMobilePanelOpen && activePanel === 'saved' ? 'active' : ''} onClick={() => openPanel('saved')}><span><Bookmark size={20} />{savedMeals.length > 0 && <b>{savedMeals.length}</b>}</span>收藏</button><button className={isMobilePanelOpen && activePanel === 'cart' ? 'active' : ''} onClick={() => openPanel('cart')}><span><ShoppingCart size={20} />{cart.length > 0 && <b>{cart.reduce((sum, item) => sum + item.quantity, 0)}</b>}</span>购物车</button><button className={isMobilePanelOpen && activePanel === 'orders' ? 'active' : ''} onClick={() => openPanel('orders')}><span><PackageCheck size={20} />{activeOrderCount > 0 && <b>{activeOrderCount}</b>}</span>订单</button></nav>
    {toast && <div className="toast" role="status" aria-live="polite"><span>{toast}</span>{toastUndo && <button type="button" onClick={async () => { const undo = toastUndo; setToast(''); setToastUndo(null); try { await undo(); showToast('已恢复到收藏夹'); } catch (error) { showToast(error instanceof Error ? error.message : '恢复失败，请重试'); } }}>撤销</button>}</div>}
    {diningRoomOpen && <DiningRoomDialog requirements={requirements} onClose={() => setDiningRoomOpen(false)} onPick={candidate => { setDiningRoomOpen(false); setMessages(previous => [...previous, { id: crypto.randomUUID(), role: 'assistant', content: `饭搭子们选中了 ${candidate.restaurant.name}。${candidate.reason}`, recommendations: [{ ...candidate, score: 100, heatScore: 0, dataStatus: 'demo', syncedAt: null, provider: { key: 'group', name: '饭搭子共识', orderUrl: null } }], createdAt: new Date().toISOString() }]); }} />}
  </div>;
}

function ChatWorkspace({ messages, requirements, restaurantCount, savedMeals, isSending, onSend, onBlindBox, onAddToCart, onSaveMeal, onFeedback }: {
  messages: ChatMessage[]; requirements: ExtractedRequirements; restaurantCount: number; savedMeals: SavedMeal[]; isSending: boolean; onSend: (message: string) => void; onBlindBox: (requirements?: ExtractedRequirements) => void; onAddToCart: (recommendation: RecommendationResult, index?: number) => void; onSaveMeal: (recommendation: RecommendationResult) => Promise<void>; onFeedback: (boxId: string, action: 'liked' | 'disliked' | 'reopened' | 'platform_opened') => void;
}) {
  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (messages.length > 0) endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isSending]);
  const submit = () => { const value = input.trim(); if (value) { setInput(''); onSend(value); } };
  const examples = ['我想吃 20 元以内销量最好的午餐', '来点清淡的，不要海鲜', '想吃日料，配送别太久', '一个人加班，30 元左右'];
  return <main className="workspace" id="main-content">
    <header className="topbar"><div><span className="topbar-kicker">TODAY'S PICK</span><h1>今天想吃点什么？</h1></div><div className="topbar-meta"><span className="status-dot" />{restaurantCount} 家可选门店</div></header>
    <section className="message-list">
      {messages.length === 0 ? <BlindBoxLaunchpad requirements={requirements} onOpen={onBlindBox} onAsk={onSend} examples={examples} /> : messages.map(message => <article className={`message ${message.role}`} key={message.id}><div className="bubble">{message.content}</div>{message.recommendations?.length ? <div className="recommendations">{message.recommendations.map(recommendation => { const itemIds = recommendation.menuItems.map(item => item.id).sort().join('|'); const isSaved = savedMeals.some(saved => saved.restaurant?.id === recommendation.restaurant.id && [...saved.menuItemIds].sort().join('|') === itemIds); return <RecommendationCard key={`${recommendation.restaurant.id}-${recommendation.totalPrice}`} recommendation={recommendation} isSaved={isSaved} onAdd={onAddToCart} onSave={onSaveMeal} blindBoxId={message.blindBoxId} onFeedback={onFeedback} />; })}</div> : null}</article>)}
      {isSending && <div className="thinking"><span /><span /><span />小呆正在匹配餐厅...</div>}<div ref={endRef} />
    </section>
    <footer className="composer-wrap"><div className="composer"><button className="icon-action" title="外卖盲盒" onClick={() => onBlindBox()}><Gift size={19} /></button><textarea value={input} rows={1} placeholder={summaryText(requirements) || '例如：20 元内、午餐、销量最好…'} onChange={event => setInput(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); submit(); } }} /><button className="send-button" title="发送消息" disabled={!input.trim() || isSending} onClick={submit}><Send size={18} /></button></div><span className="composer-hint">按 Enter 发送 · Shift + Enter 换行</span></footer>
  </main>;
}

function BlindBoxLaunchpad({ requirements, onOpen, onAsk, examples }: { requirements: ExtractedRequirements; onOpen: (requirements: ExtractedRequirements) => void; onAsk: (message: string) => void; examples: string[] }) {
  const [budget, setBudget] = useState(50);
  const [mood, setMood] = useState<'any' | 'spicy' | 'light'>('any');
  const [quizOpen, setQuizOpen] = useState(false);
  const quizTriggerRef = useRef<HTMLButtonElement>(null);
  const closeQuiz = () => { setQuizOpen(false); window.setTimeout(() => quizTriggerRef.current?.focus(), 0); };
  const boxRequirements: ExtractedRequirements = { ...requirements, budget: { min: 0, max: budget }, spiceLevel: mood === 'spicy' ? 'medium' : mood === 'light' ? 'none' : requirements.spiceLevel };
  return <div className="blindbox-launchpad"><div className="launch-visual"><div className="visual-ring outer" /><div className="visual-ring inner" /><div className="blindbox-orbit"><Gift size={34} /></div><span className="visual-note note-one">今日灵感</span><span className="visual-note note-two">好好吃饭</span></div><p className="eyebrow">YOUR LITTLE FOOD CONCIERGE</p><h2>不知道吃什么？<br /><em>让小呆替你选。</em></h2><p className="blindbox-copy">避开忌口，兼顾预算与口味，从已连接外卖渠道的可售商品中挑出今天最值得吃的一份。</p><button ref={quizTriggerRef} className="appetite-entry" onClick={() => setQuizOpen(true)}><span className="appetite-entry-icon"><Sparkles size={19} /></span><span><b>测测今日食欲人格</b><small>3 道直觉题 · 生成你的专属吃饭签</small></span><i>去测试 →</i></button><div className="control-card"><div className="box-control"><span>商品预算</span><div className="chip-row">{[30, 50, 80].map(value => <button className={budget === value ? 'selected' : ''} key={value} onClick={() => setBudget(value)}>¥{value}</button>)}</div></div><div className="box-control"><span>今日口味</span><div className="chip-row"><button className={mood === 'any' ? 'selected' : ''} onClick={() => setMood('any')}>随意</button><button className={mood === 'spicy' ? 'selected' : ''} onClick={() => setMood('spicy')}>来点辣</button><button className={mood === 'light' ? 'selected' : ''} onClick={() => setMood('light')}>清淡些</button></div></div></div><button className="open-box-button" onClick={() => onOpen(boxRequirements)}><Gift size={19} />开启今日盲盒<span>→</span></button><div className="quick-section"><span>或者这样问我</span><div className="quick-prompts">{examples.map(example => <button key={example} onClick={() => onAsk(example)}>{example}</button>)}</div></div>{quizOpen && <AppetiteQuiz baseRequirements={requirements} onClose={closeQuiz} onOpenRecommendation={profileRequirements => { setQuizOpen(false); onOpen(profileRequirements); }} />}</div>;
}

function AppetiteQuiz({ baseRequirements, onClose, onOpenRecommendation }: { baseRequirements: ExtractedRequirements; onClose: () => void; onOpenRecommendation: (requirements: ExtractedRequirements) => void }) {
  const [answers, setAnswers] = useState<AppetiteAnswer[]>([]);
  const [copied, setCopied] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const step = answers.length;
  const result = step === appetiteQuestions.length ? buildAppetiteProfile(answers, baseRequirements) : null;

  useEffect(() => {
    closeButtonRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { onClose(); return; }
      if (event.key !== 'Tab') return;
      const dialog = closeButtonRef.current?.closest('[role="dialog"]');
      const focusable = Array.from(dialog?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])') || []);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => { document.removeEventListener('keydown', onKeyDown); document.body.style.overflow = previousOverflow; };
  }, [onClose]);

  const choose = (answer: AppetiteAnswer) => setAnswers(previous => [...previous, answer]);
  const share = async () => {
    if (!result) return;
    const text = `我的今日食欲人格是「${result.name}」\n${result.tagline}\n—— 来林小呆测测你今天该吃什么`;
    try {
      if (navigator.share) await navigator.share({ title: '林小呆 · 今日食欲人格', text });
      else { await navigator.clipboard.writeText(text); setCopied(true); window.setTimeout(() => setCopied(false), 1800); }
    } catch (error) {
      if ((error as DOMException).name !== 'AbortError') {
        await navigator.clipboard.writeText(text).catch(() => undefined);
        setCopied(true); window.setTimeout(() => setCopied(false), 1800);
      }
    }
  };

  const ResultIcon = result?.icon;
  return <div className="quiz-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><section className="appetite-quiz" role="dialog" aria-modal="true" aria-labelledby="appetite-title"><button ref={closeButtonRef} className="quiz-close" aria-label="关闭食欲人格测试" onClick={onClose}><X size={19} /></button>{!result ? <><div className="quiz-topline"><span>APPETITE PERSONA</span><b>{step + 1} / {appetiteQuestions.length}</b></div><div className="quiz-progress" role="progressbar" aria-label="测试进度" aria-valuemin={0} aria-valuemax={appetiteQuestions.length} aria-valuenow={step}><span style={{ width: `${(step / appetiteQuestions.length) * 100}%` }} /></div><div className="quiz-question" key={step}><p>{appetiteQuestions[step].eyebrow}</p><h2 id="appetite-title">{appetiteQuestions[step].title}</h2><div className="quiz-options">{appetiteQuestions[step].options.map(option => { const OptionIcon = option.icon; return <button key={option.value} onClick={() => choose(option.value)}><span><OptionIcon size={23} strokeWidth={1.8} /></span><div><strong>{option.label}</strong><small>{option.hint}</small></div><i>→</i></button>; })}</div></div>{step > 0 && <button className="quiz-back" onClick={() => setAnswers(previous => previous.slice(0, -1))}>← 返回上一题</button>}</> : <div className={`persona-result ${result.className}`}><div className="persona-confetti" aria-hidden="true"><i>✦</i><i>●</i><i>✧</i><i>◆</i><i>✦</i></div><p className="persona-date">{new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric' }).format(new Date())} · 今日吃饭签</p><div className="persona-emoji">{ResultIcon && <ResultIcon size={38} strokeWidth={1.6} />}</div><span>你的今日食欲人格是</span><h2 id="appetite-title">{result.name}</h2><h3>{result.tagline}</h3><p className="persona-note">{result.note}</p><div className="persona-tags">{result.requirements.spiceLevel && <span>#{spiceLabel[result.requirements.spiceLevel]}</span>}{result.requirements.cuisines?.map(cuisine => <span key={cuisine}>#{cuisine}</span>)}{result.requirements.deliveryTimeLimit && <span>#{result.requirements.deliveryTimeLimit}分钟内</span>}</div><button className="persona-primary" onClick={() => onOpenRecommendation(result.requirements)}><Gift size={18} />按这个人格开一盒<span>→</span></button><div className="persona-secondary"><button onClick={share}><Share2 size={16} />{copied ? '文案已复制' : '分享吃饭签'}</button><button onClick={() => { setAnswers([]); setCopied(false); }}><RotateCcw size={16} />再测一次</button></div><small className="persona-brand">LIN XIAODAI · 好好吃饭，也好好生活</small></div>}</section></div>;
}

function DiningRoomDialog({ requirements, onClose, onPick }: { requirements: ExtractedRequirements; onClose: () => void; onPick: (candidate: DiningRoom['candidates'][number]) => void }) {
  const [view, setView] = useState<'home' | 'create' | 'join' | 'room'>('home');
  const [title, setTitle] = useState('今晚吃什么');
  const [code, setCode] = useState('');
  const [room, setRoom] = useState<DiningRoom | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const close = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', close);
    return () => { document.body.style.overflow = previous; document.removeEventListener('keydown', close); };
  }, [onClose]);

  useEffect(() => {
    if (!room?.id) return;
    const timer = window.setInterval(() => api.diningRoom(room.id).then(setRoom).catch(() => undefined), 4000);
    return () => window.clearInterval(timer);
  }, [room?.id]);

  const createRoom = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError('');
    try { const next = await api.createDiningRoom(title.trim() || '今晚吃什么', requirements); setRoom(next); setView('room'); }
    catch (reason) { setError(reason instanceof Error ? reason.message : '选餐房创建失败，请稍后重试'); }
    finally { setBusy(false); }
  };
  const joinRoom = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError('');
    try { const next = await api.joinDiningRoom(code); setRoom(next); setView('room'); }
    catch (reason) { setError(reason instanceof Error ? reason.message : '没找到这个选餐房，请检查口令'); }
    finally { setBusy(false); }
  };
  const vote = async (index: number) => {
    if (!room || busy) return; setBusy(true); setError('');
    try { setRoom(await api.voteDiningRoom(room.id, index)); if (navigator.vibrate) navigator.vibrate(10); }
    catch (reason) { setError(reason instanceof Error ? reason.message : '投票没有保存，请重试'); }
    finally { setBusy(false); }
  };
  const shareInvite = async () => {
    if (!room) return;
    const text = `来林小呆一起决定「${room.title}」！选餐口令：${room.code}`;
    try {
      if (navigator.share) await navigator.share({ title: room.title, text });
      else { await navigator.clipboard.writeText(text); setCopied(true); window.setTimeout(() => setCopied(false), 1800); }
    } catch (reason) {
      if ((reason as DOMException).name === 'AbortError') return;
      try { await navigator.clipboard.writeText(text); setCopied(true); window.setTimeout(() => setCopied(false), 1800); }
      catch { setError('分享失败，请手动记下房间口令'); }
    }
  };
  const goBack = () => { setError(''); setView('home'); };

  const leading = room?.consensusIndex == null ? null : room.candidates[room.consensusIndex];
  return <div className="dining-room-backdrop" onMouseDown={event => event.target === event.currentTarget && onClose()}><section className="dining-room-dialog" role="dialog" aria-modal="true" aria-labelledby="dining-room-title"><button className="room-close" aria-label="关闭饭搭子选餐房" onClick={onClose}><X size={19} /></button>{view === 'home' && <div className="room-home"><div className="room-hero-icon"><UsersRound size={30} /></div><span>DINING TOGETHER</span><h2 id="dining-room-title">一个人纠结，<br /><em>一群人投票。</em></h2><p>生成三家候选，把口令发给饭搭子。每人只需一票，几分钟找到大家都愿意吃的答案。</p><div className="room-home-actions"><button className="room-primary" onClick={() => setView('create')}><Vote size={18} />发起一局选餐<span>→</span></button><button className="room-secondary" onClick={() => setView('join')}><DoorOpen size={18} />输入口令加入</button></div><div className="room-proof"><span><Crown size={15} />发起人生成候选</span><span><UserRoundPlus size={15} />朋友口令加入</span><span><Vote size={15} />一人一票可改</span></div></div>}{view === 'create' && <form className="room-form" onSubmit={createRoom}><button type="button" className="room-back" onClick={goBack}>← 返回</button><span>CREATE A ROOM</span><h2 id="dining-room-title">给今晚这一局起个名字</h2><p>小呆会根据你当前的预算、口味和忌口，挑出三家候选。</p><label>选餐主题<input value={title} maxLength={80} autoFocus onChange={event => setTitle(event.target.value)} /></label><div className="room-preferences"><span>{requirements.budget ? `预算 ¥${requirements.budget.max} 内` : '预算随意'}</span><span>{requirements.spiceLevel ? spiceLabel[requirements.spiceLevel] : '口味随意'}</span><span>{requirements.cuisines?.join(' / ') || '菜系随意'}</span></div>{error && <p className="room-error" role="alert">{error}</p>}<button className="room-primary" type="submit" disabled={busy}>{busy ? '正在挑选三家候选…' : '生成选餐房'}<span>→</span></button></form>}{view === 'join' && <form className="room-form" onSubmit={joinRoom}><button type="button" className="room-back" onClick={goBack}>← 返回</button><span>JOIN A ROOM</span><h2 id="dining-room-title">输入饭搭子发来的口令</h2><p>口令由 6 位字母与数字组成，不区分大小写。</p><label>选餐口令<input className="room-code-input" value={code} maxLength={8} autoFocus autoComplete="off" placeholder="例如 AB3K9P" onChange={event => setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} /></label>{error && <p className="room-error" role="alert">{error}</p>}<button className="room-primary" type="submit" disabled={busy || code.length < 6}>{busy ? '正在加入…' : '进入选餐房'}<span>→</span></button></form>}{view === 'room' && room && <div className="room-live"><header><div><span>LIVE DINING ROOM</span><h2 id="dining-room-title">{room.title}</h2><p>{room.participants.length} 位饭搭子 · {room.totalVotes} 人已投票</p></div><button className={copied ? 'copied' : ''} onClick={shareInvite}><Copy size={16} />{copied ? '邀请已复制' : `口令 ${room.code}`}</button></header><div className="room-members" aria-label="参与成员">{room.participants.map(participant => <span className={participant.hasVoted ? 'voted' : ''} key={participant.id}><i>{participant.name.slice(0, 1)}</i><b>{participant.name}{participant.isHost ? ' · 发起人' : ''}</b><small>{participant.hasVoted ? '已投票' : '思考中'}</small></span>)}</div><p className="room-instruction">{room.myVote == null ? '选一家你最想吃的，之后也可以改票。' : '你的选择已经记下，票数每 4 秒自动更新。'}</p><div className="room-candidates">{room.candidates.map(candidate => { const selected = room.myVote === candidate.index; const winner = room.consensusIndex === candidate.index; return <article className={`${selected ? 'selected' : ''} ${winner ? 'leading' : ''}`} key={candidate.index}><div className="candidate-top"><span>{String(candidate.index + 1).padStart(2, '0')}</span>{winner && candidate.votes > 0 && <b><Crown size={13} />当前领先</b>}</div><h3>{candidate.restaurant.name}</h3><p>{candidate.restaurant.categories.slice(0, 3).join(' · ')}</p><div className="candidate-meta"><span><Star size={14} />{candidate.restaurant.rating}</span><span><Clock3 size={14} />{candidate.estimatedDeliveryTime} 分钟</span><span>¥{candidate.totalPrice + candidate.deliveryFee}</span></div><small>{candidate.menuItems.map(item => item.name).join('、')}</small><button disabled={busy} onClick={() => vote(candidate.index)}>{selected ? <><CheckCircle2 size={16} />我的选择 · {candidate.votes} 票</> : <><Vote size={16} />投给它 · {candidate.votes} 票</>}</button></article>; })}</div>{error && <p className="room-error" role="alert">{error}</p>}{leading && <div className="room-consensus"><Crown size={20} /><div><small>CURRENT CONSENSUS</small><strong>现在大家更想吃「{leading.restaurant.name}」</strong></div><button onClick={() => onPick(leading)}>带回点餐 <span>→</span></button></div>}<footer><button onClick={shareInvite}><Share2 size={15} />邀请更多饭搭子</button><span>房间将在 {new Date(room.expiresAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })} 前有效</span></footer></div>}</section></div>;
}

function RecommendationCard({ recommendation, isSaved, onAdd, onSave, blindBoxId, onFeedback }: { recommendation: RecommendationResult; isSaved: boolean; onAdd: (recommendation: RecommendationResult, index?: number) => void; onSave: (recommendation: RecommendationResult) => Promise<void>; blindBoxId?: string; onFeedback: (boxId: string, action: 'liked' | 'disliked' | 'reopened' | 'platform_opened') => void }) {
  const [saving, setSaving] = useState(false);
  const save = async () => { if (saving) return; setSaving(true); try { await onSave(recommendation); } finally { setSaving(false); } };
  return <div className="recommendation-card">
    <div className="rec-header"><div><h3>{recommendation.restaurant.name}</h3><p>{recommendation.restaurant.description}</p></div><div className="rec-header-actions"><button type="button" aria-label={isSaved ? `${recommendation.restaurant.name}的推荐商品已收藏` : `收藏${recommendation.restaurant.name}的推荐商品`} disabled={saving || isSaved} onClick={save}><Bookmark size={17} fill={isSaved ? 'currentColor' : 'none'} />{isSaved ? '已收藏' : saving ? '收藏中' : '收藏商品'}</button><span className="score">{Math.round(recommendation.score)} 分</span></div></div>
    <div className="rec-meta"><span><Star size={15} />{recommendation.restaurant.rating}</span><span><Clock3 size={15} />{recommendation.estimatedDeliveryTime} 分钟</span><span><Flame size={15} />热度 {recommendation.heatScore}</span></div>
    <p className="rec-reason">{recommendation.reason}</p>
    <div className={`data-status ${recommendation.dataStatus}`}><span>{recommendation.dataStatus === 'synced' ? '已授权同步' : '演示商品'}</span>{recommendation.provider?.orderUrl ? `来自 ${recommendation.provider.name}，价格与可售状态已同步` : '真实渠道正在等待授权，当前不会发起真实交易'}</div>
    <div className="menu-list">{recommendation.menuItems.map((item, index) => <div className="menu-row" key={item.id}><div><strong>{item.name}</strong><span>{item.tags.join(' / ') || item.description}</span><small>已售 {item.salesCount} 份 · 商品评分 {item.rating}{item.originalPrice && item.originalPrice > item.price ? ` · 原价 ¥${item.originalPrice}` : ''}</small></div><button aria-label={`将${item.name}加入购物车`} onClick={() => onAdd(recommendation, index)}>¥{item.price}</button></div>)}</div>
    <div className="rec-footer"><b>商品 ¥{recommendation.totalPrice} + 配送 ¥{recommendation.deliveryFee}</b>{recommendation.provider?.orderUrl ? <a className="primary-button compact" href={recommendation.provider.orderUrl} target="_blank" rel="noreferrer" onClick={() => blindBoxId && onFeedback(blindBoxId, 'platform_opened')}>去 {recommendation.provider.name} 下单</a> : <span className="redirect-pending">等待交易授权</span>}</div>
    {blindBoxId && <div className="feedback-row"><span>这次合胃口吗？</span><button onClick={() => onFeedback(blindBoxId, 'liked')}><ThumbsUp size={15} />喜欢</button><button onClick={() => onFeedback(blindBoxId, 'disliked')}><ThumbsDown size={15} />换个口味</button></div>}
  </div>;
}

function DecisionPanel({ requirements, providers }: { requirements: ExtractedRequirements; providers: ProviderSource[] }) {
  const sortLabels = { sales: '销量优先', rating: '评分优先', speed: '送达优先', value: '性价比优先' };
  return <section className="panel-body decision-panel"><div className="panel-heading"><span>PREFERENCES</span><h2>本次偏好</h2></div><div className="requirement-list"><div className="requirement-row"><span>商品预算</span><strong>{requirements.budget ? `¥${requirements.budget.max} 以内` : '未限定'}</strong></div>{requirements.sortBy && <div className="requirement-row"><span>排序方式</span><strong>{sortLabels[requirements.sortBy]}</strong></div>}<div className="requirement-row"><span>口味</span><strong>{requirements.spiceLevel ? spiceLabel[requirements.spiceLevel] : '随意'}</strong></div><div className="requirement-row"><span>忌口</span><strong>{requirements.mustAvoid?.join('、') || '无'}</strong></div></div><div className="panel-heading source-title"><span>SOURCES</span><h2>商品来源</h2></div><div className="source-list">{providers.length ? providers.map(provider => <div className="source-row" key={provider.key}><div><strong>{provider.name}</strong><span>{provider.restaurantCount} 家可选门店 · {provider.lastSyncedAt ? `更新于 ${new Date(provider.lastSyncedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}` : '等待同步'}</span></div><b className={provider.status}>{provider.status === 'authorized' ? '已授权' : provider.status === 'error' ? '异常' : '演示'}</b></div>) : <EmptyState title="暂无数据源" description="授权连接后会显示同步状态。" />}</div><div className="hint-box"><Sparkles size={18} /><p>接入授权平台后，商品价格、可售状态与配送进度会实时更新。</p></div></section>;
}

const savedOccasionLabels: Record<SavedMealOccasion, string> = { anytime: '随时想吃', workday: '加班救星', reward: '奖励自己', together: '朋友聚餐', light: '清爽回血' };

function SavedMealsPanel({ items, onReorder, onUpdate, onDelete }: { items: SavedMeal[]; onReorder: (saved: SavedMeal) => void; onUpdate: (id: string, patch: { title?: string; occasion?: SavedMealOccasion }) => Promise<void>; onDelete: (id: string) => Promise<void> }) {
  const [filter, setFilter] = useState<SavedMealOccasion | 'all'>('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const visible = filter === 'all' ? items : items.filter(item => item.occasion === filter);
  const share = async (item: SavedMeal) => {
    const text = `我在林小呆收藏了「${item.title}」：${item.restaurant?.name || '一份心动搭配'}，${item.menuItems.map(menu => menu.name).join('、')}。`;
    try { if (navigator.share) await navigator.share({ title: item.title, text }); else await navigator.clipboard.writeText(text); } catch (reason) { if ((reason as DOMException).name !== 'AbortError') { try { await navigator.clipboard.writeText(text); } catch { return; } } }
  };
  const update = async (id: string, patch: { title?: string; occasion?: SavedMealOccasion }) => { setBusyId(id); try { await onUpdate(id, patch); } finally { setBusyId(null); } };
  return <section className="panel-body saved-meals-panel"><div className="panel-heading"><span>HEARTED MENUS</span><h2>心动收藏夹</h2><p>整套保存，一键找回当时想吃的答案</p></div><div className="saved-filters" aria-label="按场景筛选收藏"><button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>全部</button>{(Object.keys(savedOccasionLabels) as SavedMealOccasion[]).map(key => <button className={filter === key ? 'active' : ''} key={key} onClick={() => setFilter(key)}>{savedOccasionLabels[key]}</button>)}</div>{visible.length ? <div className="saved-meal-list">{visible.map(item => <article className={!item.isAvailable ? 'unavailable' : ''} key={item.id}><header><div><small>{savedOccasionLabels[item.occasion]}</small><h3>{item.title}</h3><p>{item.restaurant?.name || '餐厅已下线'}</p></div><button aria-label={`删除${item.title}`} disabled={busyId === item.id} onClick={() => onDelete(item.id)}><Trash2 size={16} /></button></header><p className="saved-menu-items">{item.menuItems.map(menu => menu.name).join('、') || '菜品信息暂不可用'}</p>{item.reason && <p className="saved-reason">“{item.reason}”</p>}<div className="saved-price"><strong>当前 ¥{item.currentTotal}</strong>{item.priceChanged && <span>收藏时 ¥{item.snapshotTotal}</span>}<b className={item.isAvailable ? 'ready' : 'paused'}>{item.isAvailable ? '可整套回购' : `${item.unavailableCount} 项暂不可用`}</b></div><label>适合什么时刻<select aria-label={`${item.title}的收藏场景`} value={item.occasion} disabled={busyId === item.id} onChange={event => update(item.id, { occasion: event.target.value as SavedMealOccasion })}>{(Object.keys(savedOccasionLabels) as SavedMealOccasion[]).map(key => <option value={key} key={key}>{savedOccasionLabels[key]}</option>)}</select></label><footer><button className="saved-reorder" disabled={!item.isAvailable} onClick={() => onReorder(item)}><ShoppingCart size={16} />整套加入购物车</button><button className="saved-share" onClick={() => share(item)}><Share2 size={16} />分享</button></footer></article>)}</div> : <div className="saved-empty"><Bookmark size={28} /><h3>{items.length ? '这个场景还没有收藏' : '把心动的一餐留下来'}</h3><p>{items.length ? '换个场景看看，或者在下一次推荐里收藏整套搭配。' : '在推荐卡点击“收藏整套”，以后加班、奖励自己或朋友聚餐时都能快速找回。'}</p></div>}</section>;
}

function CartPanel({ items, address, note, onAddressChange, onNoteChange, onQuantityChange, onCheckout }: {
  items: CartItem[];
  address: string;
  note: string;
  onAddressChange: (value: string) => void;
  onNoteChange: (value: string) => void;
  onQuantityChange: (id: string, quantity: number) => void;
  onCheckout: () => void;
}) {
  const subtotal = items.reduce((sum, line) => sum + line.menuItem.price * line.quantity, 0);
  const deliveryFee = items[0]?.restaurant.deliveryFee || 0;
  const minOrderGap = Math.max(0, (items[0]?.restaurant.minOrderAmount || 0) - subtotal);
  return <section className="panel-body cart-panel"><div className="panel-heading"><span>YOUR CART</span><h2>购物车</h2></div>{items.length ? <><p className="cart-restaurant"><Store size={15} />{items[0].restaurant.name}<small>起送 ¥{items[0].restaurant.minOrderAmount}</small></p><div className="cart-list">{items.map(line => <div className="cart-row" key={line.id}><div><strong>{line.menuItem.name}</strong><span>¥{line.menuItem.price} / 份</span></div><div className="stepper"><button aria-label={`减少${line.menuItem.name}`} onClick={() => onQuantityChange(line.id, line.quantity - 1)}>−</button><b>{line.quantity}</b><button aria-label={`增加${line.menuItem.name}`} onClick={() => onQuantityChange(line.id, line.quantity + 1)}>+</button></div></div>)}</div><div className="delivery-form"><label>配送地址<input value={address} maxLength={255} placeholder="例如：国贸三期 B 座 1208" onChange={event => onAddressChange(event.target.value)} /></label><label>订单备注（选填）<textarea value={note} maxLength={300} rows={2} placeholder="例如：少盐，放前台即可" onChange={event => onNoteChange(event.target.value)} /></label></div><div className="checkout-box"><span><i>菜品小计</i><b>¥{subtotal.toFixed(2)}</b></span><span><i>配送费</i><b>¥{deliveryFee.toFixed(2)}</b></span><strong><i>合计</i><b>¥{(subtotal + deliveryFee).toFixed(2)}</b></strong>{minOrderGap > 0 && <p className="checkout-warning">还差 ¥{minOrderGap.toFixed(2)} 起送</p>}<button className="primary-button" disabled={minOrderGap > 0 || !address.trim()} onClick={onCheckout}>确认下单<span>→</span></button></div></> : <EmptyState title="购物车还是空的" description="从小呆推荐的菜单中选一份喜欢的吧。" />}</section>;
}

function OrdersPanel({ orders, tasteProfile, tastePassport, weeklyRecap, onStartPrompt, onExploreCuisine, onOrderAction, onSaveReflection }: { orders: Order[]; tasteProfile: TasteProfile | null; tastePassport: TastePassport | null; weeklyRecap: WeeklyTasteRecap | null; onStartPrompt: (prompt: string) => void; onExploreCuisine: (cuisine: string) => void; onOrderAction: (id: string, action: 'pay' | 'cancel') => void; onSaveReflection: (id: string, mood: MealMood, tags: TasteTag[], note: string) => Promise<void> }) {
  return <section className="panel-body order-panel"><div className="panel-heading"><span>ORDERS & TASTE</span><h2>我的订单</h2><p>每次回味，都会让下一次推荐更懂你</p></div>{weeklyRecap && <WeeklyRecapEntry recap={weeklyRecap} onStartPrompt={onStartPrompt} />}{tastePassport && <TastePassportCard passport={tastePassport} onExplore={onExploreCuisine} />}{tasteProfile && <TasteProfileCard profile={tasteProfile} />}{orders.length ? orders.map(order => <OrderCard key={order.id} order={order} action={onOrderAction} onSaveReflection={onSaveReflection} />) : <EmptyState title="还没有订单" description="选好菜品后，会在这里看到订单进度。" />}</section>;
}

function WeeklyRecapEntry({ recap, onStartPrompt }: { recap: WeeklyTasteRecap; onStartPrompt: (prompt: string) => void }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const close = () => { setOpen(false); window.setTimeout(() => triggerRef.current?.focus(), 0); };
  return <><button ref={triggerRef} type="button" className="weekly-recap-entry" onClick={() => setOpen(true)}><span><CalendarDays size={18} /></span><div><small>YOUR WEEK IN FOOD</small><b>{recap.hasData ? `${recap.persona.title} · 一周饭感已生成` : '这一周，还等你开席'}</b><p>{recap.hasData ? `${recap.orderCount} 餐 · ${recap.distinctCuisineCount} 种风味` : '让下一餐成为这周第一个值得记住的味道'}</p></div><i>查看周报 →</i></button>{open && <WeeklyRecapDialog initialRecap={recap} onClose={close} onStartPrompt={prompt => { setOpen(false); onStartPrompt(prompt); }} />}</>;
}

function WeeklyRecapDialog({ initialRecap, onClose, onStartPrompt }: { initialRecap: WeeklyTasteRecap; onClose: () => void; onStartPrompt: (prompt: string) => void }) {
  const [recap, setRecap] = useState(initialRecap);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const closeRef = useRef<HTMLButtonElement>(null);
  const moodLabels: Record<MealMood, string> = { delighted: '被惊艳', comforted: '很治愈', satisfied: '稳稳满足', not_for_me: '继续寻找' };
  const tagLabels: Record<TasteTag, string> = { flavorful: '够味', just_right: '刚刚好', fresh: '清爽', generous: '分量足', fast: '送得快', surprising: '有惊喜', reorder: '会复购' };
  useEffect(() => { const previous = document.body.style.overflow; document.body.style.overflow = 'hidden'; closeRef.current?.focus(); const close = (event: KeyboardEvent) => event.key === 'Escape' && onClose(); document.addEventListener('keydown', close); return () => { document.body.style.overflow = previous; document.removeEventListener('keydown', close); }; }, [onClose]);
  const changeWeek = async (offset: number) => { if (offset < 0 || offset > 12 || loading) return; setLoading(true); setError(''); try { setRecap(await api.weeklyTasteRecap(offset)); } catch { setError('这一周的饭感暂时没有加载出来，请再试一次。'); } finally { setLoading(false); } };
  const share = async () => { if (!recap.shareText) return; try { if (navigator.share) await navigator.share({ title: `林小呆 · ${recap.period.label} 一周饭感`, text: recap.shareText }); else { await navigator.clipboard.writeText(recap.shareText); setCopied(true); window.setTimeout(() => setCopied(false), 1800); } } catch (reason) { if ((reason as DOMException).name !== 'AbortError') { await navigator.clipboard.writeText(recap.shareText); setCopied(true); window.setTimeout(() => setCopied(false), 1800); } } };
  return <div className="weekly-recap-backdrop" onMouseDown={event => event.target === event.currentTarget && onClose()}><section className={`weekly-recap-dialog ${loading ? 'loading' : ''}`} role="dialog" aria-modal="true" aria-labelledby="weekly-recap-title" aria-busy={loading}><button ref={closeRef} type="button" className="weekly-recap-close" aria-label="关闭一周饭感周报" onClick={onClose}><X size={19} /></button><header><div><span>LIN XIAODAI · WEEKLY RECAP</span><h2 id="weekly-recap-title">这一周，<em>你是怎样吃饭的？</em></h2></div><nav aria-label="切换周报"><button type="button" aria-label="查看更早一周" disabled={recap.weekOffset >= 12 || loading} onClick={() => changeWeek(recap.weekOffset + 1)}><ArrowLeft size={17} /></button><b>{recap.weekOffset === 0 ? '本周' : recap.weekOffset === 1 ? '上周' : `${recap.weekOffset} 周前`} · {recap.period.label}</b><button type="button" aria-label="查看更新一周" disabled={recap.weekOffset === 0 || loading} onClick={() => changeWeek(recap.weekOffset - 1)}><ArrowRight size={17} /></button></nav>{error && <p className="weekly-recap-error" role="alert">{error}</p>}</header>{recap.hasData ? <><div className="weekly-persona"><small>YOUR FOOD MOOD</small><strong>{recap.persona.title}</strong><p>{recap.persona.summary}</p></div><div className="weekly-metrics"><div><span>认真吃了</span><strong>{recap.orderCount}<small>餐</small></strong><p>{recap.activeDays} 天为自己留了饭点</p></div><div><span>遇见风味</span><strong>{recap.distinctCuisineCount}<small>种</small></strong><p>{recap.topCuisine ? `最常想起 ${recap.topCuisine}` : '每一餐都有自己的方向'}</p></div><div><span>本周餐费</span><strong><small>¥</small>{recap.totalSpent.toFixed(0)}</strong><p>平均每餐 ¥{recap.averageOrderValue.toFixed(0)} · 仅自己可见</p></div></div><div className="weekly-story"><div><CalendarDays size={18} /><span><small>你的饭点角色</small><b>{recap.mealMoment?.label || '自在觅食家'}</b></span></div>{recap.dominantMood && <div><Heart size={18} /><span><small>回味主旋律</small><b>{moodLabels[recap.dominantMood]}</b></span></div>}{recap.topTags.length > 0 && <div><Sparkles size={18} /><span><small>被记住的瞬间</small><b>{recap.topTags.map(tag => tagLabels[tag]).join(' · ')}</b></span></div>}</div></> : <div className="weekly-empty"><Compass size={36} /><small>THIS PAGE IS YOURS</small><h3>{recap.persona.title}</h3><p>{recap.persona.summary}</p></div>}<footer><div><small>NEXT WEEK'S LITTLE QUEST</small><strong>{recap.challenge.title}</strong><p>{recap.challenge.description}</p></div><button type="button" className="weekly-quest" onClick={() => onStartPrompt(recap.challenge.prompt)}>让小呆带我去 <ArrowRight size={17} /></button>{recap.shareText && <button type="button" className="weekly-share" onClick={share}><Share2 size={16} />{copied ? '周报文案已复制' : '分享我的一周饭感'}</button>}<span>分享内容不会包含消费金额、餐厅与地址</span></footer></section></div>;
}

function TastePassportCard({ passport, onExplore }: { passport: TastePassport; onExplore: (cuisine: string) => void }) {
  const [expanded, setExpanded] = useState(passport.unlockedCount > 0);
  const progress = Math.min(100, (passport.weeklyDistinctCount / passport.weeklyGoal) * 100);
  return <article className="taste-passport-card">
    <header><div className="passport-seal"><Compass size={20} /><span>{passport.unlockedCount}/{passport.totalStamps}</span></div><div><small>TASTE EXPLORER PASSPORT</small><h3>味觉探险护照</h3><p>{passport.explorerPoints} 探险分 · {passport.completedOrderCount} 次真实抵达</p></div><button type="button" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>{expanded ? '收起' : '查看护照'}</button></header>
    <div className="passport-week"><div><b>{passport.weeklyCompleted ? '本周挑战完成' : '本周不重样挑战'}</b><span>{passport.weeklyDistinctCount} / {passport.weeklyGoal} 种菜系</span></div><div className="passport-progress" role="progressbar" aria-label="本周不重样挑战进度" aria-valuemin={0} aria-valuemax={passport.weeklyGoal} aria-valuenow={passport.weeklyDistinctCount}><span style={{ width: `${progress}%` }} /></div></div>
    {expanded && <div className="passport-stamps">{passport.stamps.map(stamp => <section className={stamp.unlocked ? 'unlocked' : 'locked'} key={stamp.cuisine}><div className="stamp-mark" aria-hidden="true">{stamp.unlocked ? <CheckCircle2 size={23} /> : <LockKeyhole size={20} />}</div><div><span>{stamp.cuisine}</span><strong>{stamp.label}</strong><small>{stamp.unlocked ? `${stamp.orderCount} 次抵达${stamp.unlockedAt ? ` · ${new Date(stamp.unlockedAt).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })} 解锁` : ''}` : stamp.description}</small></div>{!stamp.unlocked && <button type="button" onClick={() => onExplore(stamp.cuisine)}>去探索 <span>→</span></button>}</section>)}</div>}
    {passport.suggestedCuisine && <footer><Sparkles size={16} /><span>下一枚建议解锁：<b>{passport.suggestedCuisine}</b></span><button type="button" onClick={() => onExplore(passport.suggestedCuisine!)}>让小呆带路</button></footer>}
  </article>;
}

function TasteProfileCard({ profile }: { profile: TasteProfile }) {
  const tagLabels: Record<TasteTag, string> = { flavorful: '够味', just_right: '刚刚好', fresh: '清爽', generous: '分量足', fast: '送得快', surprising: '有惊喜', reorder: '会复购' };
  const target = profile.nextLevelAt || profile.checkInCount;
  const levelStart = Math.max(0, (profile.level - 1) * 3);
  const progress = profile.nextLevelAt ? Math.min(100, ((profile.checkInCount - levelStart) / Math.max(1, target - levelStart)) * 100) : 100;
  return <article className="taste-profile-card"><div className="taste-profile-top"><div className="taste-level"><Trophy size={18} /><span>Lv.{profile.level}</span></div><div><small>MY TASTE ARCHIVE</small><h3>{profile.levelName}</h3></div><b>{profile.checkInCount} 次回味</b></div><div className="taste-progress" role="progressbar" aria-label="味觉等级进度" aria-valuemin={0} aria-valuemax={target} aria-valuenow={profile.checkInCount}><span style={{ width: `${progress}%` }} /></div><p>{profile.nextLevelAt ? `再记录 ${profile.nextLevelAt - profile.checkInCount} 餐，解锁下一等级` : '你已经是很懂生活的味觉玩家'}</p>{(profile.favoriteCuisines.length > 0 || profile.topTags.length > 0) && <div className="taste-profile-tags">{profile.favoriteCuisines.slice(0, 3).map(cuisine => <span key={cuisine}>偏爱 · {cuisine}</span>)}{profile.topTags.slice(0, 2).map(tag => <span key={tag}>{tagLabels[tag]}</span>)}</div>}</article>;
}

function OrderCard({ order, action, onSaveReflection }: { order: Order; action: (id: string, action: 'pay' | 'cancel') => void; onSaveReflection: (id: string, mood: MealMood, tags: TasteTag[], note: string) => Promise<void> }) {
  const [reflectionOpen, setReflectionOpen] = useState(false);
  const progressStatuses = ['paid', 'accepted', 'preparing', 'ready_for_pickup', 'picked_up', 'delivering', 'completed'];
  const progressIndex = progressStatuses.indexOf(order.status);
  return <div className="order-card"><div className="order-card-heading"><div><h3>{order.restaurantName}</h3><span>#{order.id.slice(0, 8)} · {new Date(order.createdAt).toLocaleString('zh-CN')}</span></div><b>¥{order.total}</b></div><p>{order.items.map(item => `${item.name} x${item.quantity}`).join('，')}</p><div className={`fulfillment-source ${order.fulfillment.isLive ? 'live' : 'demo'}`}><PackageCheck size={17} /><span><b>{order.fulfillment.providerName} · {order.fulfillment.isLive ? '实时履约' : '演示履约'}</b><small>{order.fulfillment.notice}</small></span>{order.fulfillment.trackingUrl && <a href={order.fulfillment.trackingUrl} target="_blank" rel="noreferrer">查看骑手位置</a>}</div><div className={`order-status ${order.status}`}><Clock3 size={16} /><strong>{statusLabel[order.status]}</strong>{!['completed', 'cancelled'].includes(order.status) && <span>预计 {order.estimatedDeliveryTime} 分钟</span>}</div>{progressIndex >= 0 && <div className="order-progress" aria-label="订单进度">{progressStatuses.map((status, index) => <span className={index <= progressIndex ? 'done' : ''} key={status} title={statusLabel[status]} />)}</div>}{order.address && <p className="order-address">送至：{order.address}</p>}{order.events?.length ? <details className="order-events"><summary>查看进度记录（{order.events.length}）</summary>{order.events.slice().reverse().map((event, index) => <div key={`${event.createdAt}-${index}`}><span>{new Date(event.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span><p>{event.note || statusLabel[event.status]}</p></div>)}</details> : null}{order.status === 'pending_payment' && <div className="order-actions"><button className="primary-button compact" onClick={() => action(order.id, 'pay')}><CreditCard size={16} />演示支付</button><button className="outline-button" onClick={() => action(order.id, 'cancel')}>取消</button></div>}{order.status === 'completed' && <button className={`reflection-entry ${order.reflection ? 'recorded' : ''}`} onClick={() => setReflectionOpen(true)}>{order.reflection ? <><Heart size={17} fill="currentColor" /><span><b>这餐已收入味觉档案</b><small>点击可以更新你的回味</small></span></> : <><UtensilsCrossed size={17} /><span><b>这一餐，后来感觉怎么样？</b><small>15 秒留下回味 · 下一次推荐会更准</small></span></>}<i>→</i></button>}{reflectionOpen && <MealReflectionDialog order={order} onClose={() => setReflectionOpen(false)} onSave={async (mood, tags, note) => { await onSaveReflection(order.id, mood, tags, note); setReflectionOpen(false); }} />}</div>;
}

function MealReflectionDialog({ order, onClose, onSave }: { order: Order; onClose: () => void; onSave: (mood: MealMood, tags: TasteTag[], note: string) => Promise<void> }) {
  const [mood, setMood] = useState<MealMood | null>(order.reflection?.mood || null);
  const [tags, setTags] = useState<TasteTag[]>(order.reflection?.tags || []);
  const [note, setNote] = useState(order.reflection?.note || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const moodOptions: Array<{ value: MealMood; icon: typeof Heart; label: string; hint: string }> = [
    { value: 'delighted', icon: Heart, label: '被惊艳了', hint: '想把这份快乐记住' },
    { value: 'comforted', icon: Smile, label: '很治愈', hint: '是会怀念的安心味道' },
    { value: 'satisfied', icon: UtensilsCrossed, label: '挺满足', hint: '稳稳接住了这一餐' },
    { value: 'not_for_me', icon: Meh, label: '不太对味', hint: '下次帮我避开这一类' },
  ];
  const tagOptions: Array<{ value: TasteTag; label: string }> = [{ value: 'flavorful', label: '够味' }, { value: 'just_right', label: '刚刚好' }, { value: 'fresh', label: '清爽' }, { value: 'generous', label: '分量足' }, { value: 'fast', label: '送得快' }, { value: 'surprising', label: '有惊喜' }, { value: 'reorder', label: '会复购' }];
  useEffect(() => { const previous = document.body.style.overflow; document.body.style.overflow = 'hidden'; const close = (event: KeyboardEvent) => event.key === 'Escape' && onClose(); document.addEventListener('keydown', close); return () => { document.body.style.overflow = previous; document.removeEventListener('keydown', close); }; }, [onClose]);
  const toggleTag = (tag: TasteTag) => setTags(previous => previous.includes(tag) ? previous.filter(value => value !== tag) : previous.length < 4 ? [...previous, tag] : previous);
  const submit = async (event: FormEvent) => { event.preventDefault(); if (!mood || saving) return; setSaving(true); setError(''); try { await onSave(mood, tags, note); if (navigator.vibrate) navigator.vibrate(12); } catch (reason) { setError(reason instanceof Error ? reason.message : '回味保存失败，请稍后重试'); setSaving(false); } };
  return <div className="reflection-backdrop" onMouseDown={event => event.target === event.currentTarget && onClose()}><form className="reflection-dialog" role="dialog" aria-modal="true" aria-labelledby="reflection-title" onSubmit={submit}><button className="reflection-close" type="button" aria-label="关闭回味打卡" onClick={onClose}><X size={19} /></button><header><span>AFTERTASTE · 餐后回味</span><h2 id="reflection-title">这一餐，留给你什么感觉？</h2><p>{order.restaurantName} · {order.items.map(item => item.name).join('、')}</p></header><div className="reflection-moods">{moodOptions.map(option => { const Icon = option.icon; return <button type="button" className={mood === option.value ? 'selected' : ''} key={option.value} onClick={() => setMood(option.value)}><Icon size={21} /><span><b>{option.label}</b><small>{option.hint}</small></span></button>; })}</div>{mood && <div className="reflection-details"><label>哪几个瞬间值得记住？<small>最多选择 4 个</small></label><div className="reflection-tags">{tagOptions.map(option => <button type="button" className={tags.includes(option.value) ? 'selected' : ''} key={option.value} onClick={() => toggleTag(option.value)}>{option.label}</button>)}</div><label className="reflection-note">想留一句话吗？<textarea value={note} maxLength={160} rows={2} placeholder="比如：汤底很香，下次想试试微辣…" onChange={event => setNote(event.target.value)} /><small>{note.length} / 160</small></label></div>}{error && <p className="reflection-error" role="alert">{error}</p>}<button className="reflection-save" type="submit" disabled={!mood || saving}>{saving ? '正在收好这份回味…' : order.reflection ? '更新味觉档案' : '收进我的味觉档案'}<span>→</span></button></form></div>;
}

function RequirementsPanel({ requirements }: { requirements: ExtractedRequirements }) {
  const rows = [['用餐人数', requirements.peopleCount ? `${requirements.peopleCount} 人` : '未提及'], ['预算', requirements.budget ? `¥${requirements.budget.min} - ¥${requirements.budget.max}` : '未提及'], ['菜系', requirements.cuisines?.join('、') || '不限'], ['辣度', requirements.spiceLevel ? spiceLabel[requirements.spiceLevel] : '不限'], ['忌口', requirements.mustAvoid?.join('、') || '无'], ['配送时间', requirements.deliveryTimeLimit ? `${requirements.deliveryTimeLimit} 分钟内` : '不限']];
  return <section className="panel-body"><h2>当前需求</h2><div className="requirement-list">{rows.map(([label, value]) => <div className="requirement-row" key={label}><span>{label}</span><strong>{value}</strong></div>)}</div><div className="hint-box"><Gift size={20} /><p>描述越具体，推荐越准确。也可以直接点盲盒，让小呆在预算与忌口范围内随机挑选。</p></div></section>;
}

function EmptyState({ title, description }: { title: string; description: string }) { return <div className="empty-state"><Sparkles size={22} /><strong>{title}</strong><span>{description}</span></div>; }
function summaryText(requirements: ExtractedRequirements) { const parts: string[] = []; if (requirements.peopleCount) parts.push(`${requirements.peopleCount} 人`); if (requirements.budget) parts.push(`¥${requirements.budget.max} 以内`); if (requirements.spiceLevel) parts.push(spiceLabel[requirements.spiceLevel]); if (requirements.cuisines?.length) parts.push(requirements.cuisines.join('、')); return parts.length ? `继续补充需求：${parts.join(' / ')}` : ''; }

function buildAppetiteProfile(answers: AppetiteAnswer[], base: ExtractedRequirements): AppetiteProfile {
  const [energy, scene, taste] = answers;
  const common = { ...base, peopleCount: scene === 'together' ? Math.max(base.peopleCount || 0, 2) : base.peopleCount };
  if (taste === 'spicy') return { key: 'fire', icon: Flame, name: '人间烟火充电站', tagline: '今天的快乐，要热烈到冒泡。', note: energy === 'reward' ? '你不是在随便吃饭，是在认真奖励今天没有放弃的自己。' : '需要一点麻辣鲜香，把电量和好心情一起拉满。', className: 'persona-fire', requirements: { ...common, spiceLevel: 'hot', cuisines: ['川菜', '韩餐'], deliveryTimeLimit: scene === 'fast' ? 25 : base.deliveryTimeLimit } };
  if (taste === 'fresh') return { key: 'breeze', icon: Salad, name: '清醒绿洲漫游者', tagline: '轻一点，身体会先说谢谢。', note: energy === 'explore' ? '你想要新鲜，也懂得给味蕾留一点呼吸感。' : '你追求的不是少吃，而是吃完依然轻盈自在。', className: 'persona-breeze', requirements: { ...common, spiceLevel: 'none', cuisines: ['轻食', '日料'], deliveryTimeLimit: scene === 'fast' ? 25 : 35 } };
  if (scene === 'together') return { key: 'party', icon: UsersRound, name: '快乐共享召集人', tagline: '好吃的事，要和喜欢的人平分。', note: '比起精致的一人份，你更在意满桌选择和筷子碰在一起的热闹。', className: 'persona-party', requirements: { ...common, cuisines: ['中餐', '韩餐'], spiceLevel: base.spiceLevel || 'mild' } };
  if (scene === 'fast') return { key: 'swift', icon: Zap, name: '高效能量补给官', tagline: '时间很赶，味道不能敷衍。', note: '你清楚自己要什么：迅速、可靠、吃完能继续漂亮地解决问题。', className: 'persona-swift', requirements: { ...common, cuisines: ['快餐', '面食'], deliveryTimeLimit: 25, spiceLevel: base.spiceLevel || 'mild' } };
  if (energy === 'explore') return { key: 'voyager', icon: Compass, name: '味觉边界探险家', tagline: '今天不吃熟悉答案。', note: '重复会让你失去胃口，一点陌生、一点惊喜，才配得上今天这一餐。', className: 'persona-voyager', requirements: { ...common, cuisines: ['日料', '韩餐'], spiceLevel: base.spiceLevel || 'mild' } };
  return { key: 'comfort', icon: Soup, name: '碳水拥抱收藏家', tagline: '世界很吵，饭要温暖。', note: energy === 'reward' ? '你值得一份无需解释的满足感，让熟悉的香气稳稳接住今天。' : '比起猎奇，你更想被一口热乎的味道温柔接住。', className: 'persona-comfort', requirements: { ...common, cuisines: ['中餐', '面食'], spiceLevel: base.spiceLevel || 'mild' } };
}

function loadSavedCart(userId: string): CartItem[] {
  try {
    const saved = JSON.parse(localStorage.getItem(`linxiaodai:cart:${userId}`) || '[]');
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}
