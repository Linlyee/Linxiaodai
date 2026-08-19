import { FormEvent, type ComponentType, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BatteryCharging,
  Bike,
  Bookmark,
  CalendarDays,
  ChefHat,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
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
  MapPin,
  Menu,
  MessageSquarePlus,
  MessageCircle,
  Meh,
  PackageCheck,
  RefreshCw,
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
  WifiOff,
  Zap,
  X,
} from 'lucide-react';
import { API_HEALTH_EVENT, api, type ApiHealthDetail } from './api';
import type {
  CartItem,
  ChatMessage,
  CheckoutQuote,
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

function loadRecentAddresses(userId: string) {
  const current = localStorage.getItem(`linxiaodai:address:${userId}`) || '';
  try {
    const stored = JSON.parse(localStorage.getItem(`linxiaodai:recent-addresses:${userId}`) || '[]');
    const values = Array.isArray(stored) ? stored.filter(value => typeof value === 'string' && value.trim()) : [];
    return [...new Set([current, ...values].filter(Boolean))].slice(0, 4);
  } catch {
    return current ? [current] : [];
  }
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
  const [recentAddresses, setRecentAddresses] = useState<string[]>(() => loadRecentAddresses(user.id));
  const [isAddressDialogOpen, setIsAddressDialogOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [orderNote, setOrderNote] = useState('');
  const [diningRoomOpen, setDiningRoomOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isOpeningBox, setIsOpeningBox] = useState(false);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [isRefreshingOrders, setIsRefreshingOrders] = useState(false);
  const [ordersSyncError, setOrdersSyncError] = useState('');
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<'online' | 'offline' | 'degraded' | 'checking'>(() => navigator.onLine ? 'online' : 'offline');
  const [toast, setToast] = useState('');
  const [toastUndo, setToastUndo] = useState<(() => Promise<void>) | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const passportReadyRef = useRef(false);
  const connectionRetryingRef = useRef(false);

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
  const rememberDeliveryAddress = (value: string) => {
    const normalized = value.trim();
    if (!normalized) return;
    const next = [normalized, ...recentAddresses.filter(address => address !== normalized)].slice(0, 4);
    setDeliveryAddress(normalized);
    setRecentAddresses(next);
    localStorage.setItem(`linxiaodai:address:${user.id}`, normalized);
    localStorage.setItem(`linxiaodai:recent-addresses:${user.id}`, JSON.stringify(next));
  };
  const removeRecentAddress = (value: string) => {
    const next = recentAddresses.filter(address => address !== value);
    setRecentAddresses(next);
    localStorage.setItem(`linxiaodai:recent-addresses:${user.id}`, JSON.stringify(next));
  };
  const refreshConversations = () => api.conversations().then(setConversations).catch(() => setConversations([]));
  const refreshOrders = async (manual = false) => {
    if (manual) setIsRefreshingOrders(true);
    try {
      setOrders(await api.orders());
      setOrdersSyncError('');
      if (manual) showToast('已同步最新订单与配送进度');
    } catch {
      setOrdersSyncError('配送进度暂时没有同步成功，现有信息已为你保留。');
      if (manual) showToast('同步失败，请检查网络后重试');
    } finally { if (manual) setIsRefreshingOrders(false); }
  };
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

  const retryConnection = async (manual = false) => {
    if (connectionRetryingRef.current) return;
    connectionRetryingRef.current = true;
    setConnectionState('checking');
    const [restaurantResult, providerResult, orderResult] = await Promise.allSettled([api.restaurants(), api.providers(), api.orders()]);
    if (restaurantResult.status === 'fulfilled') setRestaurants(restaurantResult.value);
    if (providerResult.status === 'fulfilled') setProviders(providerResult.value);
    if (orderResult.status === 'fulfilled') { setOrders(orderResult.value); setOrdersSyncError(''); }
    const successCount = [restaurantResult, providerResult, orderResult].filter(result => result.status === 'fulfilled').length;
    const nextState = successCount === 3 ? 'online' : navigator.onLine === false ? 'offline' : 'degraded';
    setConnectionState(nextState);
    connectionRetryingRef.current = false;
    if (manual) showToast(nextState === 'online' ? '连接已恢复，商品与订单已经重新同步' : '仍未完全恢复，现有内容会继续保留');
  };

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
    const handleOffline = () => setConnectionState('offline');
    const handleOnline = () => { void retryConnection(false); };
    const handleApiHealth = (event: Event) => {
      const detail = (event as CustomEvent<ApiHealthDetail>).detail;
      if (!detail || connectionRetryingRef.current) return;
      setConnectionState(detail.state);
    };
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    window.addEventListener(API_HEALTH_EVENT, handleApiHealth);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener(API_HEALTH_EVENT, handleApiHealth);
    };
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
      setIsHistoryOpen(false);
    } catch { showToast('读取对话失败'); }
  };

  const startNewConversation = () => {
    setConversationId(null); setMessages([]); setRequirements({}); setIsHistoryOpen(false);
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
    if (isOpeningBox) return;
    setIsOpeningBox(true);
    try {
      const result = await api.blindBox(nextRequirements);
      setRequirements(nextRequirements);
      setMessages(previous => [...previous, { id: crypto.randomUUID(), role: 'assistant', content: `盲盒已打开：今天试试 ${result.recommendation.restaurant.name}。${result.recommendation.reason}`, recommendations: [result.recommendation], blindBoxId: result.boxId, createdAt: new Date().toISOString() }]);
    } catch (error) { showToast(error instanceof Error ? error.message : '盲盒暂时打不开'); }
    finally { setIsOpeningBox(false); }
  };

  const sendBlindBoxFeedback = async (boxId: string, action: 'liked' | 'disliked' | 'reopened' | 'platform_opened') => {
    try {
      await api.blindBoxFeedback(boxId, action);
      showToast(action === 'liked' ? '收到，之后会多推荐这一类。' : action === 'disliked' ? '收到，之后会减少这一类推荐。' : '已记录，你可以继续开一个。');
    } catch { showToast('反馈暂未保存，请稍后重试。'); }
  };

  const createOrder = async (checkoutItems: CartItem[]) => {
    const address = deliveryAddress.trim();
    if (!address) throw new Error('请先填写配送地址');
    setIsCreatingOrder(true);
    try {
      const order = await api.createOrder(checkoutItems, address, orderNote.trim());
      rememberDeliveryAddress(address);
      setCart([]); setOrders(previous => [order, ...previous]); setActivePanel('orders');
      setOrderNote('');
      showToast('订单已创建，请完成演示支付');
    } catch (error) {
      throw error;
    } finally { setIsCreatingOrder(false); }
  };

  const updateOrder = async (id: string, action: 'pay' | 'cancel') => {
    setBusyOrderId(id);
    try {
      const updated = action === 'pay' ? await api.payOrder(id) : await api.cancelOrder(id);
      setOrders(previous => previous.map(order => order.id === id ? updated : order));
      showToast(action === 'pay' ? '演示支付完成，履约进度将自动更新' : '订单已取消');
    } catch (error) { showToast(error instanceof Error ? error.message : '订单操作失败'); }
    finally { setBusyOrderId(null); }
  };

  const reorderOrder = async (id: string) => {
    setBusyOrderId(id);
    try {
      const preview = await api.reorderPreview(id);
      if (!preview.canReorder || !preview.restaurant || !preview.items.length) { showToast(preview.notice); return; }
      setCart(preview.items.map(line => ({ id: crypto.randomUUID(), menuItem: line.menuItem, restaurant: preview.restaurant!, quantity: line.quantity })));
      setActivePanel('cart'); setIsMobilePanelOpen(true);
      const unavailable = preview.unavailableItems.length ? ` · ${preview.unavailableItems.length} 项暂未加入` : '';
      const adjusted = preview.quantityAdjustments.length ? ` · ${preview.quantityAdjustments.length} 项按库存调整` : '';
      const price = preview.priceChanged && !preview.notice.includes('价格') ? ' · 商品价格已更新' : '';
      const delivery = preview.deliveryFeeChanged ? ' · 配送费已更新' : '';
      showToast(`${preview.notice}${unavailable}${adjusted}${price}${delivery}`);
    } catch (error) { showToast(error instanceof Error ? error.message : '复购检查失败，请稍后重试'); }
    finally { setBusyOrderId(null); }
  };

  const applyCheckoutQuote = (quote: CheckoutQuote) => {
    if (!quote.restaurant || !quote.items.length) return;
    setCart(previous => quote.items.map(line => ({
      id: previous.find(item => item.menuItem.id === line.menuItem.id)?.id || crypto.randomUUID(),
      menuItem: line.menuItem,
      restaurant: quote.restaurant!,
      quantity: line.quantity,
    })));
    showToast('购物车已按当前价格与库存更新');
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
  const activeOrders = orders.filter(order => !['completed', 'cancelled'].includes(order.status));
  const activeOrderCount = activeOrders.length;

  return <div className="app-shell">
    <a className="skip-link" href="#main-content">跳到主要内容</a>
    <aside className="sidebar" aria-label="对话导航">
      <div className="sidebar-brand"><div className="brand-mark small"><ChefHat size={19} /></div><div><strong>林小呆</strong><span>AI DINING</span></div></div>
      <button className="new-chat" onClick={startNewConversation}><MessageSquarePlus size={17} />开启新对话</button>
      <div className="side-content">
        <h3 className="side-heading"><History size={14} />最近对话</h3>
        {conversations.length ? conversations.map(conversation => <ConversationNavItem key={conversation.id} conversation={conversation} active={conversation.id === conversationId} onSelect={loadConversation} />) : <EmptyState title="还没有对话" description="告诉小呆你今天想吃什么。" />}
      </div>
      <div className="profile-card"><div className="profile-avatar">{user.name.slice(0, 1)}</div><div><strong>{user.name}</strong><span>{user.email}</span></div><button className="logout-icon" type="button" aria-label="退出登录" title="退出登录" onClick={onLogout}><LogOut size={16} /></button></div>
    </aside>
    <ChatWorkspace messages={messages} requirements={requirements} restaurantCount={restaurants.length} deliveryAddress={deliveryAddress} savedMeals={savedMeals} tasteProfile={tasteProfile} activeOrders={activeOrders} connectionState={connectionState} isSending={isSending} isOpeningBox={isOpeningBox} onOpenHistory={() => setIsHistoryOpen(true)} onOpenAddress={() => setIsAddressDialogOpen(true)} onOpenOrders={() => openPanel('orders')} onRetryConnection={() => retryConnection(true)} onSend={sendMessage} onBlindBox={openBlindBox} onAddToCart={addToCart} onSaveMeal={saveRecommendation} onFeedback={sendBlindBoxFeedback} />
    <button className="dining-room-fab" onClick={() => setDiningRoomOpen(true)}><UsersRound size={18} /><span>和饭搭子一起选</span></button>
    <aside className={`right-panel ${isMobilePanelOpen ? 'panel-open' : ''}`} aria-label="点餐详情">
      <button className="mobile-panel-close" aria-label="关闭详情面板" onClick={() => setIsMobilePanelOpen(false)}><X size={20} /></button>
      <div className="panel-tabs"><button className={activePanel === 'requirements' ? 'active' : ''} onClick={() => setActivePanel('requirements')}><Sparkles size={16} />偏好</button><button className={activePanel === 'saved' ? 'active' : ''} onClick={() => setActivePanel('saved')}><Bookmark size={16} />收藏{savedMeals.length > 0 && <b>{savedMeals.length}</b>}</button><button className={activePanel === 'cart' ? 'active' : ''} onClick={() => setActivePanel('cart')}><ShoppingCart size={16} />购物车{cart.length > 0 && <b>{cart.reduce((sum, item) => sum + item.quantity, 0)}</b>}</button><button className={activePanel === 'orders' ? 'active' : ''} onClick={() => setActivePanel('orders')}><PackageCheck size={16} />订单{activeOrderCount > 0 && <b>{activeOrderCount}</b>}</button></div>
      {activePanel === 'requirements' && <DecisionPanel requirements={requirements} providers={providers} />}
      {activePanel === 'saved' && <SavedMealsPanel items={savedMeals} onReorder={reorderSavedMeal} onUpdate={async (id, patch) => { try { const updated = await api.updateSavedMeal(id, patch); setSavedMeals(previous => previous.map(item => item.id === id ? updated : item)); } catch (error) { showToast(error instanceof Error ? error.message : '收藏更新失败，请重试'); } }} onDelete={async id => { const removed = savedMeals.find(item => item.id === id); if (!removed) return; try { await api.deleteSavedMeal(id); setSavedMeals(previous => previous.filter(item => item.id !== id)); showToastWithUndo('已移出收藏夹', async () => { const restored = await api.updateSavedMeal(id, { restore: true }); setSavedMeals(previous => [restored, ...previous.filter(item => item.id !== restored.id)]); }); } catch (error) { showToast(error instanceof Error ? error.message : '删除失败，请检查网络后重试'); } }} />}
      {activePanel === 'cart' && <CartPanel items={cart} address={deliveryAddress} note={orderNote} isSubmitting={isCreatingOrder} onAddressChange={setDeliveryAddress} onNoteChange={setOrderNote} onQuantityChange={updateCartQuantity} onQuote={() => api.checkoutQuote(cart)} onApplyQuote={applyCheckoutQuote} onFindAlternatives={() => { setIsMobilePanelOpen(false); sendMessage(`当前购物车里的商品状态有变化，请按相近预算推荐一份可以立即下单的替代餐`); }} onCheckout={createOrder} />}
      {activePanel === 'orders' && <OrdersPanel orders={orders} busyOrderId={busyOrderId} hasCartItems={cart.length > 0} isRefreshing={isRefreshingOrders} syncError={ordersSyncError} tasteProfile={tasteProfile} tastePassport={tastePassport} weeklyRecap={weeklyRecap} onRefresh={() => refreshOrders(true)} onStartPrompt={prompt => { setIsMobilePanelOpen(false); sendMessage(prompt); }} onExploreCuisine={cuisine => { setIsMobilePanelOpen(false); sendMessage(`今天想解锁味觉护照里的${cuisine}印章，请推荐一餐`); }} onOrderAction={updateOrder} onReorder={reorderOrder} onSaveReflection={saveReflection} />}
    </aside>
    {isMobilePanelOpen && <button className="mobile-panel-scrim" aria-label="关闭详情面板" onClick={() => setIsMobilePanelOpen(false)} />}
    <nav className="mobile-nav" aria-label="主要导航"><button className={!isMobilePanelOpen ? 'active' : ''} onClick={() => setIsMobilePanelOpen(false)}><MessageCircle size={20} />对话</button><button className={isMobilePanelOpen && activePanel === 'requirements' ? 'active' : ''} onClick={() => openPanel('requirements')}><SlidersHorizontal size={20} />偏好</button><button className={isMobilePanelOpen && activePanel === 'saved' ? 'active' : ''} onClick={() => openPanel('saved')}><span><Bookmark size={20} />{savedMeals.length > 0 && <b>{savedMeals.length}</b>}</span>收藏</button><button className={isMobilePanelOpen && activePanel === 'cart' ? 'active' : ''} onClick={() => openPanel('cart')}><span><ShoppingCart size={20} />{cart.length > 0 && <b>{cart.reduce((sum, item) => sum + item.quantity, 0)}</b>}</span>购物车</button><button className={isMobilePanelOpen && activePanel === 'orders' ? 'active' : ''} onClick={() => openPanel('orders')}><span><PackageCheck size={20} />{activeOrderCount > 0 && <b>{activeOrderCount}</b>}</span>订单</button></nav>
    {toast && <div className="toast" role="status" aria-live="polite"><span>{toast}</span>{toastUndo && <button type="button" onClick={async () => { const undo = toastUndo; setToast(''); setToastUndo(null); try { await undo(); showToast('已恢复到收藏夹'); } catch (error) { showToast(error instanceof Error ? error.message : '恢复失败，请重试'); } }}>撤销</button>}</div>}
    {diningRoomOpen && <DiningRoomDialog requirements={requirements} onClose={() => setDiningRoomOpen(false)} onPick={candidate => { setDiningRoomOpen(false); setMessages(previous => [...previous, { id: crypto.randomUUID(), role: 'assistant', content: `饭搭子们选中了 ${candidate.restaurant.name}。${candidate.reason}`, recommendations: [{ ...candidate, score: 100, heatScore: 0, dataStatus: 'demo', syncedAt: null, provider: { key: 'group', name: '饭搭子共识', orderUrl: null } }], createdAt: new Date().toISOString() }]); }} />}
    {isAddressDialogOpen && <AddressDialog currentAddress={deliveryAddress} recentAddresses={recentAddresses} onClose={() => setIsAddressDialogOpen(false)} onRemoveRecent={removeRecentAddress} onSave={value => { rememberDeliveryAddress(value); setIsAddressDialogOpen(false); showToast('送达地址已更新，结算时会自动带入'); }} />}
    {isHistoryOpen && <MobileHistoryDrawer conversations={conversations} activeId={conversationId} onClose={() => setIsHistoryOpen(false)} onNew={startNewConversation} onSelect={loadConversation} />}
  </div>;
}

function formatConversationTime(value: string) {
  const date = new Date(value);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return `今天 ${date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return `昨天 ${date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
  return date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
}

function ConversationNavItem({ conversation, active, onSelect }: { conversation: ConversationSummary; active: boolean; onSelect: (id: string) => void }) {
  return <button className={`conversation-item ${active ? 'active' : ''}`} type="button" aria-current={active ? 'page' : undefined} aria-label={`${conversation.title}，${formatConversationTime(conversation.updatedAt)}`} onClick={() => onSelect(conversation.id)}><i><MessageCircle size={15} /></i><span className="conversation-copy"><strong>{conversation.title}</strong><small>{formatConversationTime(conversation.updatedAt)}</small></span></button>;
}

function AddressDialog({ currentAddress, recentAddresses, onClose, onRemoveRecent, onSave }: { currentAddress: string; recentAddresses: string[]; onClose: () => void; onRemoveRecent: (value: string) => void; onSave: (value: string) => void }) {
  const [draft, setDraft] = useState(currentAddress);
  const [touched, setTouched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    inputRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); return; }
      if (event.key !== 'Tab') return;
      const focusable = [...(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled])') || [])];
      if (!focusable.length) return;
      const first = focusable[0]; const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => { document.removeEventListener('keydown', handleKeyDown); document.body.style.overflow = previousOverflow; previousFocus?.focus(); };
  }, []);
  const submit = (event: FormEvent) => {
    event.preventDefault(); setTouched(true);
    if (!draft.trim()) { inputRef.current?.focus(); return; }
    onSave(draft);
  };
  return <div className="address-backdrop" onMouseDown={event => event.target === event.currentTarget && onClose()}><section ref={dialogRef} className="address-dialog" role="dialog" aria-modal="true" aria-labelledby="address-dialog-title"><button className="address-close" type="button" aria-label="关闭地址设置" onClick={onClose}><X size={19} /></button><header><span>DELIVERY CONTEXT</span><h2 id="address-dialog-title">这一餐送到哪里？</h2><p>提前设置后，结算会自动带入；接入授权渠道后也可用于配送估时。</p></header><form onSubmit={submit} noValidate><label htmlFor="global-delivery-address">详细地址 <b>必填</b></label><div className={`address-input ${touched && !draft.trim() ? 'invalid' : ''}`}><MapPin size={18} /><input ref={inputRef} id="global-delivery-address" value={draft} maxLength={255} autoComplete="street-address" aria-invalid={touched && !draft.trim()} aria-describedby="global-address-help" placeholder="例如：国贸三期 B 座 1208" onBlur={() => setTouched(true)} onChange={event => setDraft(event.target.value)} /></div><small id="global-address-help" className={touched && !draft.trim() ? 'field-error' : 'field-help'}>{touched && !draft.trim() ? '请填写楼栋、单元或房间号，方便准确送达。' : '地址保存在当前设备，并用于结算和订单履约。'}</small>{recentAddresses.length > 0 && <div className="recent-addresses"><span>最近使用</span>{recentAddresses.map(address => <div className="recent-address-row" key={address}><button className={`recent-address-option ${draft === address ? 'selected' : ''}`} type="button" onClick={() => { setDraft(address); setTouched(true); inputRef.current?.focus(); }}><MapPin size={15} /><b>{address}</b>{draft === address && <CheckCircle2 size={16} />}</button>{address !== currentAddress && <button className="recent-address-remove" type="button" aria-label={`移除最近地址：${address}`} onClick={() => onRemoveRecent(address)}><Trash2 size={15} /></button>}</div>)}</div>}<button className="primary-button address-save" type="submit">保存并用于点餐 <ArrowRight size={17} /></button></form></section></div>;
}

function MobileHistoryDrawer({ conversations, activeId, onClose, onNew, onSelect }: { conversations: ConversationSummary[]; activeId: string | null; onClose: () => void; onNew: () => void; onSelect: (id: string) => void }) {
  const drawerRef = useRef<HTMLElement>(null);
  const newButtonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    newButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); return; }
      if (event.key !== 'Tab') return;
      const focusable = [...(drawerRef.current?.querySelectorAll<HTMLElement>('button:not([disabled])') || [])];
      if (!focusable.length) return;
      const first = focusable[0]; const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => { document.removeEventListener('keydown', handleKeyDown); document.body.style.overflow = previousOverflow; previousFocus?.focus(); };
  }, []);
  return <div className="history-backdrop" onMouseDown={event => event.target === event.currentTarget && onClose()}><aside ref={drawerRef} className="history-drawer" role="dialog" aria-modal="true" aria-labelledby="history-drawer-title"><header><div className="brand-mark small"><ChefHat size={19} /></div><div><span>YOUR FOOD THREADS</span><h2 id="history-drawer-title">最近对话</h2></div><button type="button" aria-label="关闭最近对话" onClick={onClose}><X size={19} /></button></header><button ref={newButtonRef} className="history-new" type="button" onClick={onNew}><MessageSquarePlus size={17} />开启新对话</button><div className="history-list">{conversations.length ? conversations.map(conversation => <ConversationNavItem key={conversation.id} conversation={conversation} active={conversation.id === activeId} onSelect={onSelect} />) : <div className="history-empty"><MessageCircle size={24} /><b>还没有历史对话</b><span>说出今天想吃什么，第一条记录就会出现在这里。</span></div>}</div><footer><LockKeyhole size={14} />历史对话仅当前账号可见</footer></aside></div>;
}

function RecommendationOverview({ recommendations }: { recommendations: RecommendationResult[] }) {
  if (recommendations.length < 2) return null;
  const payable = (recommendation: RecommendationResult) => recommendation.pricing?.estimatedPayable ?? recommendation.totalPrice + recommendation.deliveryFee;
  const fastest = Math.min(...recommendations.map(recommendation => recommendation.estimatedDeliveryTime));
  const lowest = Math.min(...recommendations.map(payable));
  const highestSales = Math.max(...recommendations.map(recommendation => recommendation.menuItems[0]?.salesCount || 0));
  const strength = (recommendation: RecommendationResult, index: number) => {
    const signals: string[] = [];
    if (index === 0) signals.push('综合首选');
    if (recommendation.estimatedDeliveryTime === fastest) signals.push('送得最快');
    if (payable(recommendation) === lowest) signals.push('到手更省');
    if ((recommendation.menuItems[0]?.salesCount || 0) === highestSales) signals.push('销量领先');
    return signals.slice(0, 2).join(' · ') || '值得比较';
  };
  const reveal = (restaurantId: string) => document.getElementById(`recommendation-${restaurantId}`)?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
  return <section className="decision-overview" aria-label="推荐候选速览"><header><span><Sparkles size={15} />DECISION SHORTLIST</span><div><h3>先看差异，再决定吃哪份</h3><b>{recommendations.length} 个候选</b></div><p>价格均为预计到手价，点击候选可直接查看完整理由。</p></header><div className="overview-grid">{recommendations.map((recommendation, index) => { const item = recommendation.menuItems[0]; if (!item) return null; return <button type="button" key={recommendation.restaurant.id} onClick={() => reveal(recommendation.restaurant.id)}><i>{String(index + 1).padStart(2, '0')}</i><span><strong>{item.name}</strong><small><Store size={12} />{recommendation.restaurant.name}</small></span><em>{strength(recommendation, index)}</em><b>¥{formatMoney(payable(recommendation))}</b><ArrowRight size={15} /></button>; })}</div></section>;
}

function ConnectivityBanner({ state, onRetry }: { state: 'online' | 'offline' | 'degraded' | 'checking'; onRetry: () => void }) {
  if (state === 'online') return null;
  const checking = state === 'checking';
  const offline = state === 'offline';
  return <section className={`connectivity-banner ${state}`} role={offline ? 'alert' : 'status'} aria-live={offline ? 'assertive' : 'polite'} aria-busy={checking}>
    <div className="connectivity-icon">{checking ? <RefreshCw className="spinning" size={18} /> : <WifiOff size={18} />}</div>
    <div>
      <strong>{checking ? '正在重新连接' : offline ? '你现在处于离线状态' : '数据同步暂时中断'}</strong>
      <span>{checking ? '正在重新核对门店、商品和配送状态。' : offline ? '购物车和已显示的订单都已保留，恢复网络后会自动同步。' : '推荐、价格或配送可能不是最新；现有内容不会丢失。'}</span>
    </div>
    <button type="button" disabled={checking} onClick={onRetry}>{checking ? '同步中' : '重新同步'}<RefreshCw size={14} /></button>
  </section>;
}

function ActiveOrderDock({ orders, onOpen }: { orders: Order[]; onOpen: () => void }) {
  const order = useMemo(() => [...orders].sort((left, right) => {
    const leftNeedsAction = left.status === 'pending_payment' ? 1 : 0;
    const rightNeedsAction = right.status === 'pending_payment' ? 1 : 0;
    return rightNeedsAction - leftNeedsAction || new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  })[0], [orders]);
  if (!order) return null;
  const needsPayment = order.status === 'pending_payment';
  const arrival = order.fulfillment.estimatedArrivalAt ? new Date(order.fulfillment.estimatedArrivalAt) : null;
  const hasValidArrival = arrival && !Number.isNaN(arrival.getTime());
  const progress = needsPayment ? 7 : Math.max(8, order.fulfillment.progressPercent);
  const stateLabel = needsPayment ? '这笔订单还差一步' : order.fulfillment.currentAction || statusLabel[order.status];
  const timingLabel = needsPayment
    ? `待支付 ¥${formatMoney(order.total)}`
    : hasValidArrival
      ? `预计 ${arrival.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })} 送达`
      : `预计 ${order.estimatedDeliveryTime} 分钟送达`;
  const DockIcon = needsPayment ? CreditCard : order.status === 'delivering' || order.status === 'picked_up' ? Bike : PackageCheck;
  return <section className={`active-order-dock ${needsPayment ? 'needs-action' : ''}`} aria-label="当前订单快捷状态" aria-live="polite">
    <div className="order-dock-icon"><DockIcon size={19} /></div>
    <div className="order-dock-copy">
      <div><small><i />{needsPayment ? '需要操作' : order.fulfillment.isLive ? '实时同步' : '演示同步'}</small>{orders.length > 1 && <em>另有 {orders.length - 1} 单</em>}</div>
      <strong>{stateLabel}</strong>
      <span>{order.restaurantName} · {timingLabel}</span>
    </div>
    <button type="button" onClick={onOpen} aria-label={`${needsPayment ? '前往支付' : '查看配送详情'}：${order.restaurantName}`}>{needsPayment ? '去支付' : '看进度'}<ArrowRight size={15} /></button>
    <div className="order-dock-progress" role="progressbar" aria-label="当前订单整体进度" aria-valuemin={0} aria-valuenow={progress} aria-valuemax={100}><span style={{ width: `${progress}%` }} /></div>
  </section>;
}

function ChatWorkspace({ messages, requirements, restaurantCount, deliveryAddress, savedMeals, tasteProfile, activeOrders, connectionState, isSending, isOpeningBox, onOpenHistory, onOpenAddress, onOpenOrders, onRetryConnection, onSend, onBlindBox, onAddToCart, onSaveMeal, onFeedback }: {
  messages: ChatMessage[]; requirements: ExtractedRequirements; restaurantCount: number; deliveryAddress: string; savedMeals: SavedMeal[]; tasteProfile: TasteProfile | null; activeOrders: Order[]; connectionState: 'online' | 'offline' | 'degraded' | 'checking'; isSending: boolean; isOpeningBox: boolean; onOpenHistory: () => void; onOpenAddress: () => void; onOpenOrders: () => void; onRetryConnection: () => void; onSend: (message: string) => void; onBlindBox: (requirements?: ExtractedRequirements) => void; onAddToCart: (recommendation: RecommendationResult, index?: number) => void; onSaveMeal: (recommendation: RecommendationResult) => Promise<void>; onFeedback: (boxId: string, action: 'liked' | 'disliked' | 'reopened' | 'platform_opened') => void;
}) {
  const [input, setInput] = useState('');
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { if (messages.length > 0) endRef.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); }, [messages, isSending]);
  const submit = () => { const value = input.trim(); if (value) { setInput(''); setSuggestionsOpen(false); onSend(value); } };
  const examples = ['我想吃 20 元以内销量最好的午餐', '到手价 30 元内，来点清淡的', '想吃日料，配送别太久', '一个人加班，30 元左右'];
  const latestMessage = messages.at(-1);
  const recoveryOptions = latestMessage?.role === 'assistant' && !latestMessage.recommendations?.length && !isSending ? buildRecoveryOptions(requirements) : [];
  const suggestions = buildComposerSuggestions(input, requirements);
  return <main className="workspace" id="main-content">
    <header className="topbar"><button className="topbar-history" type="button" aria-label="打开最近对话" onClick={onOpenHistory}><Menu size={20} /></button><div className="topbar-title"><span className="topbar-kicker">TODAY'S PICK</span><h1>今天想吃点什么？</h1></div><div className="topbar-actions"><button className={`delivery-location ${deliveryAddress ? 'ready' : ''}`} type="button" aria-label={deliveryAddress ? `当前送到：${deliveryAddress}，点击修改` : '设置送达地址'} aria-haspopup="dialog" onClick={onOpenAddress}><MapPin size={17} /><span><small>{deliveryAddress ? '当前送到' : '配送位置'}</small><strong>{deliveryAddress || '设置送达地址'}</strong></span><ChevronDown size={15} /></button><div className="topbar-meta"><span className="status-dot" />{restaurantCount} 家可选门店</div></div></header>
    <section className="message-list">
      <ConnectivityBanner state={connectionState} onRetry={onRetryConnection} />
      <ActiveOrderDock orders={activeOrders} onOpen={onOpenOrders} />
      {messages.length === 0 ? <BlindBoxLaunchpad requirements={requirements} restaurantCount={restaurantCount} deliveryAddress={deliveryAddress} tasteProfile={tasteProfile} opening={isOpeningBox} onOpen={onBlindBox} onAsk={onSend} examples={examples} /> : messages.map(message => <article className={`message ${message.role}`} key={message.id}><div className="bubble">{message.content}</div>{message.recommendations?.length ? <><RecommendationOverview recommendations={message.recommendations} /><div className="recommendations">{message.recommendations.map((recommendation, index) => { const itemIds = recommendation.menuItems.map(item => item.id).sort().join('|'); const isSaved = savedMeals.some(saved => saved.restaurant?.id === recommendation.restaurant.id && [...saved.menuItemIds].sort().join('|') === itemIds); return <RecommendationCard key={`${recommendation.restaurant.id}-${recommendation.totalPrice}`} recommendation={recommendation} rank={index} isSaved={isSaved} onAdd={onAddToCart} onSave={onSaveMeal} blindBoxId={message.blindBoxId} onFeedback={onFeedback} />; })}</div></> : null}</article>)}
      {recoveryOptions.length > 0 && <section className="search-recovery" aria-label="调整搜索条件"><div><RotateCcw size={18} /><span><b>换个条件，马上再找</b><small>保留其他偏好，只调整最可能卡住结果的条件</small></span></div><div className="recovery-actions">{recoveryOptions.map(option => <button key={option.prompt} type="button" onClick={() => onSend(option.prompt)}><strong>{option.label}</strong><span>{option.detail}</span></button>)}</div></section>}
      {isSending && <div className="thinking"><span /><span /><span />小呆正在匹配商品...</div>}<div ref={endRef} />
    </section>
    <footer className="composer-wrap" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setSuggestionsOpen(false); }}>
      {suggestionsOpen && suggestions.length > 0 && <section className="composer-suggestions" id="composer-suggestions" aria-label="搜索意图建议"><div><Sparkles size={15} /><span>帮你补全需求</span><small>选择后仍可继续编辑</small></div>{suggestions.map(suggestion => <button type="button" key={suggestion.text} onClick={() => { setInput(suggestion.text); setSuggestionsOpen(false); window.requestAnimationFrame(() => composerRef.current?.focus()); }}><span>{suggestion.text}</span><small>{suggestion.hint}</small><ArrowRight size={15} /></button>)}</section>}
      <div className="composer"><button className="icon-action" aria-label={isOpeningBox ? '正在开启外卖盲盒' : '开启外卖盲盒'} title="外卖盲盒" disabled={isOpeningBox} onClick={() => onBlindBox()}>{isOpeningBox ? <i className="button-spinner" /> : <Gift size={19} />}</button><textarea ref={composerRef} value={input} rows={1} aria-autocomplete="list" aria-controls="composer-suggestions" aria-expanded={suggestionsOpen && suggestions.length > 0} placeholder={summaryText(requirements) || '例如：20 元内、午餐、销量最好…'} onFocus={() => setSuggestionsOpen(true)} onChange={event => { setInput(event.target.value); setSuggestionsOpen(true); }} onKeyDown={event => { if (event.key === 'Escape') { setSuggestionsOpen(false); return; } if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); submit(); } }} /><button className="send-button" aria-label="发送消息" title="发送消息" disabled={!input.trim() || isSending} onClick={submit}><Send size={18} /></button></div><span className="composer-hint">按 Enter 发送 · Shift + Enter 换行 · Esc 收起建议</span>
    </footer>
  </main>;
}

function getMealMoment(hour = new Date().getHours()) {
  if (hour >= 5 && hour < 10) return { label: '早餐灵感', meal: '早餐', headline: '给今天一个不匆忙的开始', note: '清醒一点，也要吃得踏实' };
  if (hour >= 10 && hour < 15) return { label: '午餐灵感', meal: '午餐', headline: '忙归忙，午饭不能随便', note: '用一顿刚好的饭，把电量补回来' };
  if (hour >= 15 && hour < 18) return { label: '午后灵感', meal: '下午加餐', headline: '留一点甜和松弛给下午', note: '不必很重，也别让快乐缺席' };
  if (hour >= 18 && hour < 22) return { label: '晚餐灵感', meal: '晚餐', headline: '把今天收进一顿热乎的饭里', note: '好好吃饭，是一天温柔的收尾' };
  return { label: '夜宵灵感', meal: '夜宵', headline: '夜还没结束，胃口也值得被照顾', note: '选一份满足，但不必太有负担' };
}

function BlindBoxLaunchpad({ requirements, restaurantCount, deliveryAddress, tasteProfile, opening, onOpen, onAsk, examples }: { requirements: ExtractedRequirements; restaurantCount: number; deliveryAddress: string; tasteProfile: TasteProfile | null; opening: boolean; onOpen: (requirements: ExtractedRequirements) => void; onAsk: (message: string) => void; examples: string[] }) {
  const [budget, setBudget] = useState(50);
  const [mood, setMood] = useState<'any' | 'spicy' | 'light'>('any');
  const [quizOpen, setQuizOpen] = useState(false);
  const quizTriggerRef = useRef<HTMLButtonElement>(null);
  const closeQuiz = () => { setQuizOpen(false); window.setTimeout(() => quizTriggerRef.current?.focus(), 0); };
  const boxRequirements: ExtractedRequirements = { ...requirements, budget: { min: 0, max: budget }, spiceLevel: mood === 'spicy' ? 'medium' : mood === 'light' ? 'none' : requirements.spiceLevel };
  const moment = getMealMoment();
  const favoriteCuisine = tasteProfile?.favoriteCuisines[0];
  const shortcuts = [
    { icon: Trophy, eyebrow: '销量优先', title: '¥20 内热销王', detail: `${moment.meal}不踩雷`, prompt: `我想吃 20 元以内销量最好的${moment.meal}` },
    { icon: Zap, eyebrow: '时间优先', title: '30 分钟内送到', detail: '快一点，也别将就', prompt: `想吃${moment.meal}，30 分钟内送到，速度优先` },
    { icon: Heart, eyebrow: favoriteCuisine ? '懂你口味' : '评分优先', title: favoriteCuisine ? `再遇见${favoriteCuisine}` : '附近高分好味', detail: favoriteCuisine ? '延续你的味觉偏爱' : '从高分开始选', prompt: favoriteCuisine ? `想吃${favoriteCuisine}，结合我的口味推荐一份${moment.meal}` : `推荐附近评分最高的${moment.meal}` },
    { icon: Compass, eyebrow: '到手价优先', title: '¥30 不超预算', detail: '配送费也算在内', prompt: examples[1] || `到手价 30 元以内推荐${moment.meal}` },
  ];
  return <section className="blindbox-launchpad" aria-labelledby="launch-title" aria-busy={opening}><div className="meal-context-bar"><span><i /><b>{moment.label}</b><small>{moment.note}</small></span><div><span><Store size={13} />{restaurantCount} 家可选</span><span className={deliveryAddress ? 'ready' : ''}><MapPin size={13} />{deliveryAddress ? '配送地址已就绪' : '结算前可设置地址'}</span></div></div><div className="launch-grid"><div className="launch-story"><div className="launch-visual"><div className="visual-ring outer" /><div className="visual-ring inner" /><div className="blindbox-orbit"><Gift size={30} /></div><span className="visual-note note-one">今日灵感</span><span className="visual-note note-two">好好吃饭</span></div><div><p className="eyebrow">YOUR LITTLE FOOD CONCIERGE</p><h2 id="launch-title">不知道吃什么？<br /><em>让小呆替你选。</em></h2><p className="blindbox-copy">{moment.headline}。告诉我预算和口味，剩下的交给小呆。</p></div></div><div className="launch-actions"><button ref={quizTriggerRef} className="appetite-entry" type="button" onClick={() => setQuizOpen(true)}><span className="appetite-entry-icon"><Sparkles size={19} /></span><span><b>测测今日食欲人格</b><small>3 道直觉题 · 生成专属吃饭签</small></span><i>去测试 →</i></button><div className="control-card"><div className="box-control"><span>商品预算</span><div className="chip-row">{[30, 50, 80].map(value => <button type="button" aria-pressed={budget === value} className={budget === value ? 'selected' : ''} key={value} onClick={() => setBudget(value)}>¥{value}</button>)}</div></div><div className="box-control"><span>今日口味</span><div className="chip-row"><button type="button" aria-pressed={mood === 'any'} className={mood === 'any' ? 'selected' : ''} onClick={() => setMood('any')}>随意</button><button type="button" aria-pressed={mood === 'spicy'} className={mood === 'spicy' ? 'selected' : ''} onClick={() => setMood('spicy')}>来点辣</button><button type="button" aria-pressed={mood === 'light'} className={mood === 'light' ? 'selected' : ''} onClick={() => setMood('light')}>清淡些</button></div></div></div><button className="open-box-button" type="button" disabled={opening} onClick={() => onOpen(boxRequirements)}>{opening ? <><i className="button-spinner" />正在为你拆盒…</> : <><Gift size={19} />开启今日盲盒<span>→</span></>}</button><p className="launch-trust"><CheckCircle2 size={14} />先筛可售商品，下单前再次核价与验库存</p></div></div><div className="occasion-shortcuts"><header><span>ONE-TAP MOMENTS</span><h3>此刻就想这样吃</h3></header><div>{shortcuts.map(shortcut => { const ShortcutIcon = shortcut.icon; return <button type="button" key={shortcut.title} onClick={() => onAsk(shortcut.prompt)}><span><ShortcutIcon size={18} /></span><div><small>{shortcut.eyebrow}</small><b>{shortcut.title}</b><em>{shortcut.detail}</em></div><ArrowRight size={15} /></button>; })}</div></div>{quizOpen && <AppetiteQuiz baseRequirements={requirements} onClose={closeQuiz} onOpenRecommendation={profileRequirements => { setQuizOpen(false); onOpen(profileRequirements); }} />}</section>;
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

function RecommendationCard({ recommendation, rank, isSaved, onAdd, onSave, blindBoxId, onFeedback }: { recommendation: RecommendationResult; rank: number; isSaved: boolean; onAdd: (recommendation: RecommendationResult, index?: number) => void; onSave: (recommendation: RecommendationResult) => Promise<void>; blindBoxId?: string; onFeedback: (boxId: string, action: 'liked' | 'disliked' | 'reopened' | 'platform_opened') => void }) {
  const [saving, setSaving] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const addedTimerRef = useRef<number | null>(null);
  const primaryItem = recommendation.menuItems[0];
  const pricing = recommendation.pricing || {
    itemPrice: recommendation.totalPrice,
    originalItemPrice: recommendation.menuItems.reduce((sum, item) => sum + (item.originalPrice || item.price), 0),
    deliveryFee: recommendation.deliveryFee,
    estimatedPayable: recommendation.totalPrice + recommendation.deliveryFee,
    savings: recommendation.menuItems.reduce((sum, item) => sum + Math.max(0, (item.originalPrice || item.price) - item.price), 0),
    budgetScope: 'item' as const,
    matchedPrice: recommendation.totalPrice,
    disclaimer: '预计价格，下单前会再次校验',
  };
  const freshness = recommendation.freshness || {
    status: recommendation.dataStatus === 'synced' ? 'recent' as const : 'demo' as const,
    label: recommendation.dataStatus === 'synced' ? '已同步' : '演示样本',
    syncedAt: recommendation.syncedAt,
  };
  const save = async () => { if (saving) return; setSaving(true); try { await onSave(recommendation); } finally { setSaving(false); } };
  const addPrimary = () => {
    onAdd(recommendation, 0);
    setJustAdded(true);
    if (addedTimerRef.current) window.clearTimeout(addedTimerRef.current);
    addedTimerRef.current = window.setTimeout(() => setJustAdded(false), 1800);
    if (navigator.vibrate) navigator.vibrate(10);
  };
  useEffect(() => () => { if (addedTimerRef.current) window.clearTimeout(addedTimerRef.current); }, []);
  if (!primaryItem) return null;
  const DishIcon = primaryItem.category.includes('汤') || primaryItem.name.includes('汤') ? Soup : primaryItem.category.includes('轻食') || primaryItem.name.includes('沙拉') ? Salad : UtensilsCrossed;
  const visualTone = primaryItem.spiceLevel === 'hot' || primaryItem.spiceLevel === 'medium' ? 'spicy' : primaryItem.category.includes('轻食') ? 'fresh' : 'comfort';
  return <div className="recommendation-card" id={`recommendation-${recommendation.restaurant.id}`}>
    <header className="rec-product-hero">
      <div className={`dish-visual ${visualTone}`} aria-hidden="true"><span>TOP PICK</span><DishIcon size={35} strokeWidth={1.45} /><small>{primaryItem.category}</small></div>
      <div className="rec-product-copy"><div className="product-eyebrow"><span><CheckCircle2 size={13} />{rank === 0 ? '综合首选' : `候选 ${String(rank + 1).padStart(2, '0')}`}</span><small>{recommendation.provider?.name || '渠道商品'}</small></div><h3>{primaryItem.name}</h3><p>{primaryItem.description || recommendation.restaurant.description}</p><div className="product-tags">{primaryItem.tags.slice(0, 3).map(tag => <span key={tag}>{tag}</span>)}</div><div className="store-line"><Store size={14} /><span>{recommendation.restaurant.name}</span><small>{recommendation.restaurant.categories.slice(0, 2).join(' · ')}</small></div></div>
      <button className="rec-save" type="button" aria-label={isSaved ? `${primaryItem.name}已收藏` : `收藏${primaryItem.name}`} disabled={saving || isSaved} onClick={save}><Bookmark size={17} fill={isSaved ? 'currentColor' : 'none'} /><span>{isSaved ? '已收藏' : saving ? '收藏中' : '收藏'}</span></button>
    </header>
    <div className="rec-meta"><span><Star size={15} />商品 {primaryItem.rating}</span><span><Flame size={15} />已售 {primaryItem.salesCount}</span><span><Clock3 size={15} />约 {recommendation.estimatedDeliveryTime} 分钟</span></div>
    <p className="rec-reason"><Sparkles size={15} />{recommendation.reason}</p>
    <div className={`data-status ${recommendation.dataStatus}`}><span>{recommendation.dataStatus === 'synced' ? '渠道已连接' : '演示数据'}</span>{recommendation.provider?.orderUrl ? `来自 ${recommendation.provider.name}，下单前仍会校验价格与库存` : '当前可体验站内下单与配送流程，不会产生真实扣款'}</div>
    {recommendation.menuItems.length > 1 && <div className="additional-items"><span>搭配内还有</span>{recommendation.menuItems.slice(1).map((item, index) => <button key={item.id} onClick={() => onAdd(recommendation, index + 1)}><span>{item.name}</span><b>¥{formatMoney(item.price)} · 加入</b></button>)}</div>}
    <div className="price-trust"><div className="price-trust-top"><div className="payable-price"><span>预计到手</span><strong>¥{formatMoney(pricing.estimatedPayable)}</strong>{pricing.savings > 0 && <b>已省 ¥{formatMoney(pricing.savings)}</b>}</div><button className={`rec-add-primary ${justAdded ? 'added' : ''}`} aria-label={`将${primaryItem.name}加入购物车`} onClick={addPrimary}>{justAdded ? <CheckCircle2 size={17} /> : <ShoppingCart size={17} />}<span>{justAdded ? '已加入 · 再加一份' : '加入购物车'}</span><b>¥{formatMoney(primaryItem.price)}</b></button></div><div className="price-breakdown"><span>商品 ¥{formatMoney(pricing.itemPrice)} + 配送 ¥{formatMoney(pricing.deliveryFee)}</span><span className={`freshness ${freshness.status}`}><RotateCcw size={13} />{freshness.label} · {pricing.budgetScope === 'delivered' ? '按到手价命中' : '按商品价命中'}</span></div><small>{pricing.disclaimer}</small></div>
    <div className="rec-footer">{recommendation.provider?.orderUrl ? <><span className="redirect-ready">也可先加入购物车统一结算</span><a className="primary-button compact" href={recommendation.provider.orderUrl} target="_blank" rel="noreferrer" onClick={() => blindBoxId && onFeedback(blindBoxId, 'platform_opened')}>去 {recommendation.provider.name} 下单</a></> : <span className="redirect-ready"><CheckCircle2 size={15} />可加入购物车体验站内下单</span>}</div>
    {blindBoxId && <div className="feedback-row"><span>这次合胃口吗？</span><button onClick={() => onFeedback(blindBoxId, 'liked')}><ThumbsUp size={15} />喜欢</button><button onClick={() => onFeedback(blindBoxId, 'disliked')}><ThumbsDown size={15} />换个口味</button></div>}
  </div>;
}

function DecisionPanel({ requirements, providers }: { requirements: ExtractedRequirements; providers: ProviderSource[] }) {
  const sortLabels = { sales: '销量优先', rating: '评分优先', speed: '送达优先', value: '性价比优先' };
  const deliveredBudget = requirements.budgetScope === 'delivered';
  return <section className="panel-body decision-panel"><div className="panel-heading"><span>PREFERENCES</span><h2>本次偏好</h2></div><div className="requirement-list"><div className="requirement-row budget-requirement"><span>{deliveredBudget ? '到手价预算' : '商品预算'}<small>{deliveredBudget ? '包含配送费' : '配送费另计'}</small></span><strong>{requirements.budget ? `¥${requirements.budget.max} 以内` : '未限定'}</strong></div>{requirements.sortBy && <div className="requirement-row"><span>排序方式</span><strong>{sortLabels[requirements.sortBy]}</strong></div>}<div className="requirement-row"><span>口味</span><strong>{requirements.spiceLevel ? spiceLabel[requirements.spiceLevel] : '随意'}</strong></div><div className="requirement-row"><span>忌口</span><strong>{requirements.mustAvoid?.join('、') || '无'}</strong></div></div><div className="panel-heading source-title"><span>SOURCES</span><h2>商品来源</h2></div><div className="source-list">{providers.length ? providers.map(provider => <div className="source-row" key={provider.key}><div><strong>{provider.name}</strong><span>{provider.restaurantCount} 家可选门店 · {provider.lastSyncedAt ? `更新于 ${new Date(provider.lastSyncedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}` : '等待同步'}</span></div><b className={provider.status}>{provider.status === 'authorized' ? '已授权' : provider.status === 'error' ? '异常' : '演示'}</b></div>) : <EmptyState title="暂无数据源" description="授权连接后会显示同步状态。" />}</div><div className="hint-box"><Sparkles size={18} /><p>接入授权平台后，商品价格、可售状态与配送进度会实时更新。</p></div></section>;
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

function CartPanel({ items, address, note, isSubmitting, onAddressChange, onNoteChange, onQuantityChange, onQuote, onApplyQuote, onFindAlternatives, onCheckout }: {
  items: CartItem[];
  address: string;
  note: string;
  isSubmitting: boolean;
  onAddressChange: (value: string) => void;
  onNoteChange: (value: string) => void;
  onQuantityChange: (id: string, quantity: number) => void;
  onQuote: () => Promise<CheckoutQuote>;
  onApplyQuote: (quote: CheckoutQuote) => void;
  onFindAlternatives: () => void;
  onCheckout: (items: CartItem[]) => Promise<void>;
}) {
  const [step, setStep] = useState<'edit' | 'review'>('edit');
  const [addressTouched, setAddressTouched] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [quote, setQuote] = useState<CheckoutQuote | null>(null);
  const [isQuoting, setIsQuoting] = useState(false);
  const addressRef = useRef<HTMLInputElement>(null);
  const subtotal = items.reduce((sum, line) => sum + line.menuItem.price * line.quantity, 0);
  const deliveryFee = items[0]?.restaurant.deliveryFee || 0;
  const minOrderGap = Math.max(0, (items[0]?.restaurant.minOrderAmount || 0) - subtotal);
  const total = subtotal + deliveryFee;
  const cartSignature = items.map(line => `${line.menuItem.id}:${line.quantity}:${line.menuItem.price}:${line.restaurant.deliveryFee}`).join('|');
  const quotedItems: CartItem[] = quote?.restaurant ? quote.items.map(line => ({ id: items.find(item => item.menuItem.id === line.menuItem.id)?.id || line.menuItem.id, menuItem: line.menuItem, restaurant: quote.restaurant!, quantity: line.quantity })) : items;
  const reviewSubtotal = quote?.currentSubtotal ?? subtotal;
  const reviewDeliveryFee = quote?.deliveryFee ?? deliveryFee;
  const reviewTotal = quote?.currentTotal ?? total;
  useEffect(() => { setStep('edit'); setSubmitError(''); setQuote(null); }, [cartSignature]);
  const reviewOrder = async (event: FormEvent) => {
    event.preventDefault();
    if (isQuoting) return;
    setAddressTouched(true); setSubmitError(''); setQuote(null);
    if (!address.trim()) { addressRef.current?.focus(); return; }
    if (minOrderGap > 0) return;
    setIsQuoting(true);
    try {
      const nextQuote = await onQuote();
      setQuote(nextQuote);
      if (nextQuote.canCheckout) setStep('review');
    } catch (reason) {
      setSubmitError(reason instanceof Error ? `${reason.message}，请稍后重新核对。` : '暂时无法核对价格与库存，请稍后重试。');
    } finally { setIsQuoting(false); }
  };
  const placeOrder = async () => {
    if (isSubmitting) return;
    setSubmitError('');
    try { await onCheckout(quotedItems); }
    catch (reason) {
      const message = reason instanceof Error ? reason.message : '订单没有提交成功，请稍后重试。';
      if (message.includes('重新核对') || message.includes('已变化')) { setStep('edit'); setQuote(null); setSubmitError(`${message}，已返回购物车。`); }
      else setSubmitError(`${message}，请检查后重试。`);
    }
  };
  if (!items.length) return <section className="panel-body cart-panel"><div className="panel-heading"><span>YOUR CART</span><h2>购物车</h2></div><EmptyState title="购物车还是空的" description="从小呆推荐的商品中选一份喜欢的吧。" /></section>;
  return <section className="panel-body cart-panel">
    <div className="checkout-steps" aria-label="结算进度"><span className={step === 'edit' ? 'active' : 'done'}><i>{step === 'review' ? <CheckCircle2 size={13} /> : '1'}</i>编辑订单</span><b /><span className={step === 'review' ? 'active' : ''}><i>2</i>核对提交</span></div>
    {step === 'edit' ? <form onSubmit={reviewOrder} noValidate>
      <div className="panel-heading"><span>YOUR CART</span><h2>这一单吃什么</h2><p>先确认商品和送达信息，下步再提交</p></div>
      <p className="cart-restaurant"><Store size={15} />{items[0].restaurant.name}<small>起送 ¥{items[0].restaurant.minOrderAmount}</small></p>
      <div className="cart-list">{items.map(line => <div className="cart-row" key={line.id}><div><strong>{line.menuItem.name}</strong><span>¥{formatMoney(line.menuItem.price * line.quantity)} · {line.menuItem.category}</span></div><div className="stepper" aria-label={`${line.menuItem.name}数量`}><button type="button" aria-label={`减少${line.menuItem.name}`} onClick={() => onQuantityChange(line.id, line.quantity - 1)}>−</button><b>{line.quantity}</b><button type="button" aria-label={`增加${line.menuItem.name}`} onClick={() => onQuantityChange(line.id, line.quantity + 1)}>+</button></div></div>)}</div>
      <div className="delivery-form"><label htmlFor="delivery-address"><span>配送地址 <b>必填</b></span><input ref={addressRef} id="delivery-address" value={address} maxLength={255} autoComplete="street-address" aria-invalid={addressTouched && !address.trim()} aria-describedby="delivery-address-help" placeholder="例如：国贸三期 B 座 1208" onBlur={() => setAddressTouched(true)} onChange={event => { onAddressChange(event.target.value); setSubmitError(''); }} /></label><small id="delivery-address-help" className={addressTouched && !address.trim() ? 'field-error' : 'field-help'}>{addressTouched && !address.trim() ? '请填写详细地址，包含楼栋和房间号。' : '常用地址会保存在当前设备，下次可以直接使用。'}</small><label htmlFor="order-note"><span>订单备注 <small>选填</small></span><textarea id="order-note" value={note} maxLength={300} rows={2} placeholder="例如：少盐，放前台即可" onChange={event => onNoteChange(event.target.value)} /></label></div>
      {quote && !quote.canCheckout && <div className="quote-recovery" role="alert"><CircleAlert size={19} /><div><b>{quote.notice}</b><span>提交前发现商品状态与购物车记录不一致。</span></div>{quote.unavailableItems.length > 0 && <ul>{quote.unavailableItems.map(item => <li key={`${item.name}-${item.reason}`}><span>{item.name}</span><b>{item.reason}</b></li>)}</ul>}{quote.quantityAdjustments.length > 0 && <ul>{quote.quantityAdjustments.map(item => <li key={item.name}><span>{item.name}</span><b>{item.fromQuantity} 份 → {item.toQuantity} 份</b></li>)}</ul>}<div className="quote-recovery-actions">{quote.restaurant && quote.items.length > 0 && <button type="button" onClick={() => { onApplyQuote(quote); setQuote(null); setSubmitError(''); }}>按实时信息更新</button>}<button type="button" className="quote-alternative" onClick={onFindAlternatives}>让小呆换一份</button></div></div>}
      {submitError && <p className="checkout-submit-error" role="alert">{submitError}</p>}
      <div className="checkout-box"><span><i>商品小计</i><b>¥{formatMoney(subtotal)}</b></span><span><i>配送费</i><b>¥{formatMoney(deliveryFee)}</b></span><strong><i>预计合计</i><b>¥{formatMoney(total)}</b></strong>{minOrderGap > 0 && <p className="checkout-warning" role="alert">还差 ¥{formatMoney(minOrderGap)} 起送，可返回推荐继续加购。</p>}<button className="primary-button checkout-primary" type="submit" disabled={minOrderGap > 0 || isQuoting}>{isQuoting ? <><i className="button-spinner" />正在核对实时价格…</> : <>核对订单 <span>¥{formatMoney(total)} →</span></>}</button><small className="checkout-safe"><LockKeyhole size={13} />核对价格与库存，不会直接扣款</small></div>
    </form> : <div className="checkout-review" aria-live="polite">
      <button className="checkout-back" type="button" disabled={isSubmitting} onClick={() => { setStep('edit'); setSubmitError(''); setQuote(null); }}><ArrowLeft size={16} />返回修改</button>
      <div className="panel-heading"><span>FINAL CHECK</span><h2>核对后再提交</h2><p>价格、库存、地址和履约方式都确认无误</p></div>
      <div className="review-hero"><CheckCircle2 size={22} /><div><strong>{quote?.restaurant?.name || items[0].restaurant.name}</strong><span>{quotedItems.reduce((sum, item) => sum + item.quantity, 0)} 份商品 · 预计 {quote?.restaurant?.avgDeliveryTime || items[0].restaurant.avgDeliveryTime} 分钟</span></div></div>
      {quote && (quote.priceChanged || quote.deliveryFeeChanged) ? <div className="quote-change-note" role="status"><RefreshCw size={18} /><div><b>实时核价发现变化</b><span>以下价格已更新，请确认后再提交。</span></div><ul>{quote.items.filter(item => Math.abs(item.previousPrice - item.currentPrice) >= 0.01).map(item => <li key={item.menuItem.id}><span>{item.menuItem.name}</span><b>¥{formatMoney(item.previousPrice)} → ¥{formatMoney(item.currentPrice)}</b></li>)}{quote.deliveryFeeChanged && <li><span>配送费</span><b>¥{formatMoney(quote.previousDeliveryFee)} → ¥{formatMoney(quote.deliveryFee)}</b></li>}</ul></div> : <div className="quote-verified"><CheckCircle2 size={16} /><span><b>实时价格与库存已确认</b><small>刚刚完成核对，提交时仍会再次校验。</small></span></div>}
      <div className="review-section"><span>商品明细</span>{quotedItems.map(line => <div key={line.id}><p>{line.menuItem.name}<small>× {line.quantity}</small></p><b>¥{formatMoney(line.menuItem.price * line.quantity)}</b></div>)}</div>
      <div className="review-section"><span>送达信息</span><div><p>{address}<small>{note.trim() ? `备注：${note.trim()}` : '无订单备注'}</small></p></div></div>
      <div className="review-total"><span>预计支付</span><strong>¥{formatMoney(reviewTotal)}</strong><small>商品 ¥{formatMoney(reviewSubtotal)} + 配送 ¥{formatMoney(reviewDeliveryFee)}</small></div>
      <div className="demo-payment-note"><LockKeyhole size={16} /><span><b>演示环境，不会真实扣款</b><small>提交后可完整体验支付、制作和配送进度。</small></span></div>
      {submitError && <p className="checkout-submit-error" role="alert">{submitError}</p>}
      <button className="primary-button checkout-submit" type="button" disabled={isSubmitting} onClick={placeOrder}>{isSubmitting ? <><i className="button-spinner" />正在提交订单…</> : <><CreditCard size={17} />确认提交 <span>¥{formatMoney(reviewTotal)}</span></>}</button>
    </div>}
  </section>;
}

function OrdersPanel({ orders, busyOrderId, hasCartItems, isRefreshing, syncError, tasteProfile, tastePassport, weeklyRecap, onRefresh, onStartPrompt, onExploreCuisine, onOrderAction, onReorder, onSaveReflection }: { orders: Order[]; busyOrderId: string | null; hasCartItems: boolean; isRefreshing: boolean; syncError: string; tasteProfile: TasteProfile | null; tastePassport: TastePassport | null; weeklyRecap: WeeklyTasteRecap | null; onRefresh: () => void; onStartPrompt: (prompt: string) => void; onExploreCuisine: (cuisine: string) => void; onOrderAction: (id: string, action: 'pay' | 'cancel') => void; onReorder: (id: string) => Promise<void>; onSaveReflection: (id: string, mood: MealMood, tags: TasteTag[], note: string) => Promise<void> }) {
  const activeOrders = orders.filter(order => !['completed', 'cancelled'].includes(order.status));
  const [filter, setFilter] = useState<'active' | 'all'>(() => activeOrders.length ? 'active' : 'all');
  const visibleOrders = filter === 'active' ? activeOrders : orders;
  return <section className="panel-body order-panel"><div className="order-panel-heading"><div className="panel-heading"><span>ORDER JOURNEY</span><h2>订单与配送</h2><p>先看正在发生的事，再回顾已经吃过的味道</p></div><button className="orders-refresh" type="button" disabled={isRefreshing} aria-label="刷新订单与配送进度" onClick={onRefresh}><RefreshCw size={15} className={isRefreshing ? 'spinning' : ''} />{isRefreshing ? '同步中' : '刷新'}</button></div><div className="order-filters" aria-label="筛选订单"><button className={filter === 'active' ? 'active' : ''} onClick={() => setFilter('active')}>进行中 <span>{activeOrders.length}</span></button><button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>全部订单 <span>{orders.length}</span></button></div>{syncError && <div className="orders-sync-error" role="alert"><CircleAlert size={16} /><span>{syncError}</span><button type="button" disabled={isRefreshing} onClick={onRefresh}>重试</button></div>}{visibleOrders.length ? <div className="order-list">{visibleOrders.map(order => <OrderCard key={order.id} order={order} busy={busyOrderId === order.id} hasCartItems={hasCartItems} action={onOrderAction} onReorder={onReorder} onSaveReflection={onSaveReflection} />)}</div> : filter === 'active' && orders.length ? <div className="orders-caught-up"><CheckCircle2 size={25} /><h3>当前没有进行中的订单</h3><p>已完成和已取消的记录都还在。</p><button onClick={() => setFilter('all')}>查看全部订单</button></div> : <EmptyState title="还没有订单" description="选好商品后，会在这里看到支付与配送进度。" />}<div className="order-insights"><div className="order-insights-heading"><span>TASTE ARCHIVE</span><h3>吃过之后，也值得记住</h3></div>{weeklyRecap && <WeeklyRecapEntry recap={weeklyRecap} onStartPrompt={onStartPrompt} />}{tastePassport && <TastePassportCard passport={tastePassport} onExplore={onExploreCuisine} />}{tasteProfile && <TasteProfileCard profile={tasteProfile} />}</div></section>;
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

function OrderCard({ order, busy, hasCartItems, action, onReorder, onSaveReflection }: { order: Order; busy: boolean; hasCartItems: boolean; action: (id: string, action: 'pay' | 'cancel') => void; onReorder: (id: string) => Promise<void>; onSaveReflection: (id: string, mood: MealMood, tags: TasteTag[], note: string) => Promise<void> }) {
  const [reflectionOpen, setReflectionOpen] = useState(false);
  const [cancelConfirming, setCancelConfirming] = useState(false);
  const [reorderConfirming, setReorderConfirming] = useState(false);
  const stageLabels = ['已支付', '渠道确认', '准备中', '配送中', '已送达'];
  const stageIndexByStatus: Record<string, number> = { paid: 0, accepted: 1, preparing: 2, ready_for_pickup: 2, picked_up: 3, delivering: 3, completed: 4 };
  const progressIndex = stageIndexByStatus[order.status] ?? -1;
  const latestEvent = order.events?.[order.events.length - 1];
  const isTerminal = ['completed', 'cancelled'].includes(order.status);
  const statusMessage = latestEvent?.note || (order.status === 'pending_payment' ? '提交支付后，渠道才会开始处理订单' : statusLabel[order.status]);
  const [clock, setClock] = useState(() => Date.now());
  useEffect(() => {
    if (isTerminal || order.status === 'pending_payment') return;
    const timer = window.setInterval(() => setClock(Date.now()), 10000);
    return () => window.clearInterval(timer);
  }, [isTerminal, order.status]);
  const estimatedArrival = order.fulfillment.estimatedArrivalAt ? new Date(order.fulfillment.estimatedArrivalAt) : null;
  const remainingMinutes = estimatedArrival ? Math.max(0, Math.ceil((estimatedArrival.getTime() - clock) / 60000)) : order.estimatedDeliveryTime;
  const arrivalTime = estimatedArrival && !Number.isNaN(estimatedArrival.getTime()) ? estimatedArrival.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : null;
  const remainingLabel = order.status === 'pending_payment' ? '等待操作' : order.fulfillment.delayStatus === 'delayed' ? '预计稍有延迟' : remainingMinutes <= 1 ? '即将送达' : `约 ${remainingMinutes} 分钟`;
  const syncedAt = new Date(order.fulfillment.lastSyncedAt);
  const syncAgeSeconds = Number.isNaN(syncedAt.getTime()) ? 0 : Math.max(0, Math.floor((clock - syncedAt.getTime()) / 1000));
  const syncLabel = syncAgeSeconds < 20 ? '刚刚同步' : syncAgeSeconds < 60 ? `${syncAgeSeconds} 秒前同步` : syncAgeSeconds < 3600 ? `${Math.floor(syncAgeSeconds / 60)} 分钟前同步` : `${syncedAt.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })} 同步`;
  return <article className={`order-card ${isTerminal ? 'terminal' : 'active-order'}`}>
    <header className="order-card-heading"><div><span className={`order-state-pill ${order.status}`}><i />{statusLabel[order.status]}</span><h3>{order.restaurantName}</h3><small>订单 #{order.id.slice(0, 8)} · {new Date(order.createdAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</small></div><b>¥{formatMoney(order.total)}</b></header>
    {!isTerminal && <div className={`order-now ${order.fulfillment.delayStatus}`}><div><Clock3 size={19} /></div><span><small>{order.status === 'pending_payment' ? '等待支付' : arrivalTime ? `预计 ${arrivalTime} 送达` : '预计送达'}</small><strong>{remainingLabel}</strong><p>{order.fulfillment.currentAction || statusMessage}</p></span>{order.status !== 'pending_payment' && <b className="delivery-percent">{order.fulfillment.progressPercent}%</b>}<div className="delivery-progress-track" role="progressbar" aria-label="配送整体进度" aria-valuemin={0} aria-valuenow={order.fulfillment.progressPercent} aria-valuemax={100}><span style={{ width: `${order.fulfillment.progressPercent}%` }} /></div><footer><span><i />{syncLabel}</span>{order.fulfillment.nextMilestone && <b>下一步：{order.fulfillment.nextMilestone}</b>}</footer></div>}
    <div className="order-line-items">{order.items.map(item => <div key={item.id}><span>{item.name}<small>× {item.quantity}</small></span><b>¥{formatMoney(item.price * item.quantity)}</b></div>)}</div>
    {progressIndex >= 0 && <ol className="delivery-journey" role="progressbar" aria-label={`订单进度：${stageLabels[progressIndex]}`} aria-valuemin={1} aria-valuenow={progressIndex + 1} aria-valuemax={stageLabels.length}>{stageLabels.map((label, index) => <li className={index < progressIndex ? 'done' : index === progressIndex ? 'current' : ''} key={label}><i>{index <= progressIndex ? <CheckCircle2 size={14} /> : index + 1}</i><span>{label}</span></li>)}</ol>}
    {order.fulfillment.rider && <div className="delivery-rider"><span><Bike size={18} /></span><div><b>{order.fulfillment.rider.displayName}</b><small>{order.fulfillment.rider.status}</small></div><em>{order.fulfillment.rider.vehicle}</em></div>}
    <div className={`fulfillment-source ${order.fulfillment.isLive ? 'live' : 'demo'}`}><PackageCheck size={17} /><span><b>{order.fulfillment.providerName} · {order.fulfillment.isLive ? '实时履约' : '演示履约'}</b><small>{order.fulfillment.notice}</small></span>{order.fulfillment.trackingUrl && <a href={order.fulfillment.trackingUrl} target="_blank" rel="noreferrer">查看骑手位置</a>}</div>
    {order.address && <div className="order-address"><Store size={15} /><span><small>送达地址</small>{order.address}</span></div>}
    {order.events?.length ? <details className="order-events"><summary>查看完整进度（{order.events.length} 条）</summary>{order.events.slice().reverse().map((event, index) => <div key={`${event.createdAt}-${index}`}><span>{new Date(event.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span><p>{event.note || statusLabel[event.status]}</p></div>)}</details> : null}
    {order.status === 'pending_payment' && !cancelConfirming && <div className="payment-actions"><div><CreditCard size={17} /><span><b>演示支付 ¥{formatMoney(order.total)}</b><small>不会调用真实支付，也不会扣款</small></span></div><button className="primary-button compact" disabled={busy} onClick={() => action(order.id, 'pay')}>{busy ? <><i className="button-spinner" />处理中…</> : '立即支付'}</button><button className="order-cancel" disabled={busy} onClick={() => setCancelConfirming(true)}>取消订单</button></div>}
    {order.status === 'pending_payment' && cancelConfirming && <div className="cancel-confirmation" role="alert"><div><b>确定取消这笔订单吗？</b><span>取消后需要重新选择商品并提交。</span></div><button disabled={busy} onClick={() => setCancelConfirming(false)}>保留订单</button><button className="confirm-cancel" disabled={busy} onClick={() => action(order.id, 'cancel')}>{busy ? '取消中…' : '确定取消'}</button></div>}
    {order.status === 'completed' && !reorderConfirming && <div className="completed-order-actions"><button className="order-reorder" type="button" disabled={busy} onClick={() => hasCartItems ? setReorderConfirming(true) : onReorder(order.id)}>{busy ? <><i className="button-spinner" /><span><b>正在核对当前价格…</b><small>同时检查库存与门店状态</small></span></> : <><RotateCcw size={17} /><span><b>再来一单</b><small>按当前价格与库存重新核对</small></span><ArrowRight size={16} /></>}</button><button className={`reflection-entry ${order.reflection ? 'recorded' : ''}`} onClick={() => setReflectionOpen(true)}>{order.reflection ? <><Heart size={17} fill="currentColor" /><span><b>这餐已收入味觉档案</b><small>点击可以更新你的回味</small></span></> : <><UtensilsCrossed size={17} /><span><b>这一餐，后来感觉怎么样？</b><small>15 秒留下回味 · 下一次推荐会更准</small></span></>}<i>→</i></button></div>}
    {order.status === 'completed' && reorderConfirming && <div className="reorder-confirmation" role="alert"><ShoppingCart size={18} /><div><b>替换当前购物车？</b><span>复购会先核对价格和库存，再用这笔历史订单替换购物车商品。</span></div><button type="button" disabled={busy} onClick={() => setReorderConfirming(false)}>保留购物车</button><button className="confirm-reorder" type="button" disabled={busy} onClick={async () => { await onReorder(order.id); setReorderConfirming(false); }}>{busy ? '核对中…' : '替换并复购'}</button></div>}
    {reflectionOpen && <MealReflectionDialog order={order} onClose={() => setReflectionOpen(false)} onSave={async (mood, tags, note) => { await onSaveReflection(order.id, mood, tags, note); setReflectionOpen(false); }} />}
  </article>;
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
function buildRecoveryOptions(requirements: ExtractedRequirements) {
  const options: Array<{ label: string; detail: string; prompt: string }> = [];
  if (requirements.budget) {
    const relaxedBudget = Math.ceil((requirements.budget.max + 10) / 5) * 5;
    const scope = requirements.budgetScope === 'delivered' ? '到手价' : '商品价';
    options.push({ label: `放宽到 ¥${relaxedBudget}`, detail: `${scope}预算增加一点`, prompt: `${scope} ${relaxedBudget} 元以内，其他条件不变` });
    if (requirements.budgetScope === 'delivered') options.push({ label: '配送费另算', detail: `商品仍控制在 ¥${requirements.budget.max} 内`, prompt: `按商品价控制在 ${requirements.budget.max} 元以内，配送费另算，其他条件不变` });
  }
  if (requirements.cuisines?.length) options.push({ label: '不限菜系', detail: '保留预算和口味', prompt: '菜系不限，其他条件不变' });
  if (requirements.spiceLevel && options.length < 3) options.push({ label: '口味不限', detail: '扩大可选商品范围', prompt: '口味不限，其他条件不变' });
  if (!options.length) options.push({ label: '看看热销', detail: '30 元商品价内', prompt: '推荐 30 元以内销量最好的商品' });
  return options.slice(0, 3);
}

function buildComposerSuggestions(value: string, requirements: ExtractedRequirements) {
  const query = value.trim();
  const library = [
    { text: '20 元以内销量最好的午餐', hint: '商品价 · 销量优先' },
    { text: '到手价 30 元以内，30 分钟内送到', hint: '含配送费 · 速度优先' },
    { text: '来点清淡的，不要海鲜', hint: '口味与忌口' },
    { text: '想吃日料，评分最高的优先', hint: '菜系 · 评分优先' },
  ];
  if (!query) {
    if (requirements.budget) {
      const budget = requirements.budget.max;
      return [
        { text: `到手价 ${budget} 元以内，其他条件不变`, hint: '将配送费计入预算' },
        { text: '30 分钟内送到，其他条件不变', hint: '增加配送时限' },
        { text: '销量最好的优先，其他条件不变', hint: '调整排序方式' },
      ];
    }
    return library.slice(0, 3);
  }
  const directMatches = library.filter(item => item.text.includes(query) || [...query].filter(character => character.trim()).every(character => item.text.includes(character)));
  if (directMatches.length) return directMatches.slice(0, 3);
  const contextual: Array<{ text: string; hint: string }> = [];
  if (!/(销量|评分|最快|性价比|实惠)/.test(query)) contextual.push({ text: `${query}，销量最好的优先`, hint: '补充销量排序' });
  if (!/(元|块|预算|到手价|商品价)/.test(query)) contextual.push({ text: `${query}，到手价 30 元以内`, hint: '补充含配送预算' });
  if (!/(分钟|送到|配送|尽快)/.test(query)) contextual.push({ text: `${query}，30 分钟内送到`, hint: '补充配送时限' });
  if (contextual.length < 3 && !/(清淡|辣|口味)/.test(query)) contextual.push({ text: `${query}，口味清淡一些`, hint: '补充口味偏好' });
  if (contextual.length < 3) contextual.push({ text: `${query}，评分最高的优先`, hint: '补充评分排序' });
  return contextual.slice(0, 3);
}

function formatMoney(value: number) { return Number.isInteger(value) ? String(value) : value.toFixed(2); }

function summaryText(requirements: ExtractedRequirements) { const parts: string[] = []; if (requirements.peopleCount) parts.push(`${requirements.peopleCount} 人`); if (requirements.budget) parts.push(`${requirements.budgetScope === 'delivered' ? '到手价' : '商品价'} ¥${requirements.budget.max} 以内`); if (requirements.spiceLevel) parts.push(spiceLabel[requirements.spiceLevel]); if (requirements.cuisines?.length) parts.push(requirements.cuisines.join('、')); return parts.length ? `继续补充需求：${parts.join(' / ')}` : ''; }

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
