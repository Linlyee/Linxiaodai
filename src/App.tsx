import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bot,
  ChefHat,
  CheckCircle2,
  Clock3,
  CreditCard,
  Flame,
  Gift,
  LogOut,
  MessageSquarePlus,
  PackageCheck,
  Send,
  ShoppingCart,
  Sparkles,
  Star,
  Store,
  ThumbsDown,
  ThumbsUp,
  User,
  Utensils,
} from 'lucide-react';
import { api } from './api';
import type {
  CartItem,
  ChatMessage,
  ConversationSummary,
  ExtractedRequirements,
  MerchantDashboard,
  Order,
  RecommendationResult,
  ProviderSource,
  Restaurant,
  UserProfile,
} from './types';

const spiceLabel: Record<string, string> = { none: '不辣', mild: '微辣', medium: '中辣', hot: '重辣' };
const statusLabel: Record<string, string> = {
  pending_payment: '待支付', paid: '待商家接单', accepted: '商家已接单', preparing: '制作中',
  ready_for_pickup: '待配送', delivering: '配送中', completed: '已完成', cancelled: '已取消',
};
const merchantActions: Record<string, { label: string; action: string }> = {
  paid: { label: '接单', action: 'accepted' },
  accepted: { label: '开始制作', action: 'preparing' },
  preparing: { label: '制作完成', action: 'ready_for_pickup' },
  ready_for_pickup: { label: '交给配送', action: 'delivering' },
  delivering: { label: '完成订单', action: 'completed' },
};

export function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    api.me().then(setUser).catch(() => setUser(null));
  }, []);

  const logout = async () => {
    await api.logout().catch(() => undefined);
    setUser(null);
  };

  const handleAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setAuthError('');
    try {
      const email = String(form.get('email') || '');
      const password = String(form.get('password') || '');
      const profile = authMode === 'login'
        ? await api.login(email, password)
        : await api.register(String(form.get('name') || ''), email, password);
      setUser(profile);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : '登录失败，请稍后重试');
    }
  };

  if (!user) return <AuthScreen mode={authMode} setMode={setAuthMode} error={authError} onSubmit={handleAuth} />;
  if (user.role === 'merchant' || user.role === 'admin') return <MerchantWorkspace user={user} onLogout={logout} />;
  return <CustomerWorkspace user={user} onLogout={logout} />;
}

function AuthScreen({ mode, setMode, error, onSubmit }: {
  mode: 'login' | 'register'; setMode: (mode: 'login' | 'register') => void; error: string; onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return <main className="auth-screen">
    <section className="auth-copy">
      <div className="brand-mark"><ChefHat size={34} /></div>
      <h1>林小呆</h1>
      <p>可运营的 AI 点餐助手。把人数、预算、口味和忌口告诉小呆，得到能直接下单的餐厅与菜品组合。</p>
      <div className="auth-stats"><span>持久化订单</span><span>商家工作台</span><span>智能推荐</span></div>
    </section>
    <form className="auth-card" onSubmit={onSubmit}>
      <h2>{mode === 'login' ? '欢迎回来' : '创建顾客账户'}</h2>
      <p className="muted">顾客演示账号：demo@linxiaodai.com / demo123</p>
      <p className="muted">商家演示账号：merchant@linxiaodai.com / demo123</p>
      {mode === 'register' && <label>昵称<input name="name" placeholder="例如：林小呆" required /></label>}
      <label>邮箱<input name="email" type="email" defaultValue="demo@linxiaodai.com" required /></label>
      <label>密码<input name="password" type="password" defaultValue="demo123" minLength={6} required /></label>
      {error && <p className="form-error">{error}</p>}
      <button className="primary-button" type="submit"><User size={18} />{mode === 'login' ? '登录' : '注册并登录'}</button>
      <button className="link-button" type="button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
        {mode === 'login' ? '还没有账号？去注册' : '已有账号？去登录'}
      </button>
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
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [activePanel, setActivePanel] = useState<'requirements' | 'cart' | 'orders'>('requirements');
  const [isSending, setIsSending] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2400);
  };
  const refreshConversations = () => api.conversations().then(setConversations).catch(() => setConversations([]));
  const refreshOrders = () => api.orders().then(setOrders).catch(() => setOrders([]));

  useEffect(() => {
    api.restaurants().then(setRestaurants).catch(() => setRestaurants([]));
    api.providers().then(setProviders).catch(() => setProviders([]));
    refreshConversations();
    refreshOrders();
  }, []);

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
    setCart(previous => {
      const sameRestaurant = previous.length === 0 || previous[0].restaurant.id === recommendation.restaurant.id;
      const base = sameRestaurant ? previous : [];
      const existing = base.find(line => line.menuItem.id === menuItem.id);
      return existing
        ? base.map(line => line.menuItem.id === menuItem.id ? { ...line, quantity: line.quantity + 1 } : line)
        : [...base, { id: crypto.randomUUID(), menuItem, restaurant: recommendation.restaurant, quantity: 1 }];
    });
    setActivePanel('cart');
    showToast('已加入购物车');
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
    try {
      const order = await api.createOrder(cart);
      setCart([]); setOrders(previous => [order, ...previous]); setActivePanel('orders');
      showToast('订单已创建，请完成模拟支付');
    } catch (error) { showToast(error instanceof Error ? error.message : '下单失败'); }
  };

  const updateOrder = async (id: string, action: 'pay' | 'cancel') => {
    try {
      const updated = action === 'pay' ? await api.payOrder(id) : await api.cancelOrder(id);
      setOrders(previous => previous.map(order => order.id === id ? updated : order));
      showToast(action === 'pay' ? '支付成功，已通知商家' : '订单已取消');
    } catch (error) { showToast(error instanceof Error ? error.message : '订单操作失败'); }
  };

  return <div className="app-shell">
    <aside className="sidebar">
      <button className="new-chat" onClick={() => { setConversationId(null); setMessages([]); setRequirements({}); }}><MessageSquarePlus size={18} />新对话</button>
      <div className="side-content">
        <div className="profile-card"><strong>{user.name}</strong><span>{user.email}</span><button className="danger-button" onClick={onLogout}><LogOut size={16} />退出登录</button></div>
        <h3 className="side-heading">历史对话</h3>
        {conversations.length ? conversations.map(conversation => <button className="conversation-item" key={conversation.id} onClick={() => loadConversation(conversation.id)}><strong>{conversation.title}</strong><span>{new Date(conversation.updatedAt).toLocaleString('zh-CN')}</span></button>) : <EmptyState title="还没有对话" description="告诉小呆你今天想吃什么。" />}
      </div>
    </aside>
    <ChatWorkspace messages={messages} requirements={requirements} restaurantCount={restaurants.length} isSending={isSending} onSend={sendMessage} onBlindBox={openBlindBox} onAddToCart={addToCart} onFeedback={sendBlindBoxFeedback} />
    <DecisionPanel requirements={requirements} providers={providers} />
    {toast && <div className="toast">{toast}</div>}
  </div>;
}

function ChatWorkspace({ messages, requirements, restaurantCount, isSending, onSend, onBlindBox, onAddToCart, onFeedback }: {
  messages: ChatMessage[]; requirements: ExtractedRequirements; restaurantCount: number; isSending: boolean; onSend: (message: string) => void; onBlindBox: (requirements?: ExtractedRequirements) => void; onAddToCart: (recommendation: RecommendationResult, index?: number) => void; onFeedback: (boxId: string, action: 'liked' | 'disliked' | 'reopened' | 'platform_opened') => void;
}) {
  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isSending]);
  const submit = () => { const value = input.trim(); if (value) { setInput(''); onSend(value); } };
  const examples = ['两个人吃，想吃辣，60 元以内', '来点清淡的，不要海鲜', '想吃日料，配送别太久', '一个人加班，30 元左右'];
  return <main className="workspace">
    <header className="topbar"><div><h1>林小呆</h1><span>AI 外卖决策助手</span></div><div className="topbar-meta"><Utensils size={16} />已接入 {restaurantCount} 家餐厅</div></header>
    <section className="message-list">
      {messages.length === 0 ? <BlindBoxLaunchpad requirements={requirements} onOpen={onBlindBox} onAsk={onSend} examples={examples} /> : messages.map(message => <article className={`message ${message.role}`} key={message.id}><div className="bubble">{message.content}</div>{message.recommendations?.length ? <div className="recommendations">{message.recommendations.map(recommendation => <RecommendationCard key={`${recommendation.restaurant.id}-${recommendation.totalPrice}`} recommendation={recommendation} onAdd={onAddToCart} blindBoxId={message.blindBoxId} onFeedback={onFeedback} />)}</div> : null}</article>)}
      {isSending && <div className="thinking"><span /><span /><span />小呆正在匹配餐厅...</div>}<div ref={endRef} />
    </section>
    <footer className="composer"><button className="icon-action" title="外卖盲盒" onClick={() => onBlindBox()}><Gift size={20} /></button><textarea value={input} rows={1} placeholder={summaryText(requirements) || '告诉我想吃什么，例如：两个人、想吃辣、60 元以内'} onChange={event => setInput(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); submit(); } }} /><button className="send-button" title="发送消息" disabled={!input.trim() || isSending} onClick={submit}><Send size={19} /></button></footer>
  </main>;
}

function BlindBoxLaunchpad({ requirements, onOpen, onAsk, examples }: { requirements: ExtractedRequirements; onOpen: (requirements: ExtractedRequirements) => void; onAsk: (message: string) => void; examples: string[] }) {
  const [budget, setBudget] = useState(50);
  const [mood, setMood] = useState<'any' | 'spicy' | 'light'>('any');
  const boxRequirements: ExtractedRequirements = { ...requirements, budget: { min: 0, max: budget }, spiceLevel: mood === 'spicy' ? 'medium' : mood === 'light' ? 'none' : requirements.spiceLevel };
  return <div className="blindbox-launchpad"><div className="blindbox-orbit"><Gift size={42} /></div><p className="eyebrow">不知道吃什么，就交给一点惊喜</p><h2>开一个午餐盲盒</h2><p className="blindbox-copy">小呆会先避开忌口与最近吃过的店，再用预算、口味和热度挑一份刚刚好的答案。</p><div className="box-control"><span>预算</span><div className="chip-row">{[30, 50, 80].map(value => <button className={budget === value ? 'selected' : ''} key={value} onClick={() => setBudget(value)}>¥{value}</button>)}</div></div><div className="box-control"><span>今天想吃</span><div className="chip-row"><button className={mood === 'any' ? 'selected' : ''} onClick={() => setMood('any')}>随意</button><button className={mood === 'spicy' ? 'selected' : ''} onClick={() => setMood('spicy')}>来点辣</button><button className={mood === 'light' ? 'selected' : ''} onClick={() => setMood('light')}>清淡些</button></div></div><button className="open-box-button" onClick={() => onOpen(boxRequirements)}><Gift size={20} />现在开盒</button><div className="quick-prompts">{examples.map(example => <button key={example} onClick={() => onAsk(example)}>{example}</button>)}</div></div>;
}

function RecommendationCard({ recommendation, onAdd, blindBoxId, onFeedback }: { recommendation: RecommendationResult; onAdd: (recommendation: RecommendationResult, index?: number) => void; blindBoxId?: string; onFeedback: (boxId: string, action: 'liked' | 'disliked' | 'reopened' | 'platform_opened') => void }) {
  return <div className="recommendation-card">
    <div className="rec-header"><div><h3>{recommendation.restaurant.name}</h3><p>{recommendation.restaurant.description}</p></div><span className="score">{Math.round(recommendation.score)} 分</span></div>
    <div className="rec-meta"><span><Star size={15} />{recommendation.restaurant.rating}</span><span><Clock3 size={15} />{recommendation.estimatedDeliveryTime} 分钟</span><span><Flame size={15} />热度 {recommendation.heatScore}</span></div>
    <p className="rec-reason">{recommendation.reason}</p>
    <div className={`data-status ${recommendation.dataStatus}`}><span>{recommendation.dataStatus === 'synced' ? '已授权同步' : '演示数据'}</span>{recommendation.provider?.orderUrl ? `来自 ${recommendation.provider.name}，可跳转至原平台下单` : '实时平台同步功能正在接入，暂不可跳转下单'}</div>
    <div className="menu-list">{recommendation.menuItems.map((item, index) => <div className="menu-row" key={item.id}><div><strong>{item.name}</strong><span>{item.tags.join(' / ') || item.description}</span></div><button onClick={() => onAdd(recommendation, index)}>¥{item.price}</button></div>)}</div>
    <div className="rec-footer"><b>菜品 ¥{recommendation.totalPrice} + 配送 ¥{recommendation.deliveryFee}</b>{recommendation.provider?.orderUrl ? <a className="primary-button compact" href={recommendation.provider.orderUrl} target="_blank" rel="noreferrer" onClick={() => blindBoxId && onFeedback(blindBoxId, 'platform_opened')}>前往 {recommendation.provider.name} 下单</a> : !blindBoxId && <button className="primary-button compact" onClick={() => onAdd(recommendation)}><ShoppingCart size={17} />查看组合</button>}</div>
    {blindBoxId && <div className="feedback-row"><span>这次合胃口吗？</span><button onClick={() => onFeedback(blindBoxId, 'liked')}><ThumbsUp size={15} />喜欢</button><button onClick={() => onFeedback(blindBoxId, 'disliked')}><ThumbsDown size={15} />换个口味</button></div>}
  </div>;
}

function DecisionPanel({ requirements, providers }: { requirements: ExtractedRequirements; providers: ProviderSource[] }) {
  return <aside className="right-panel decision-panel"><section className="panel-body"><h2>本次偏好</h2><div className="requirement-list"><div className="requirement-row"><span>预算</span><strong>{requirements.budget ? `¥${requirements.budget.max} 以内` : '未限定'}</strong></div><div className="requirement-row"><span>口味</span><strong>{requirements.spiceLevel ? spiceLabel[requirements.spiceLevel] : '随意'}</strong></div><div className="requirement-row"><span>忌口</span><strong>{requirements.mustAvoid?.join('、') || '无'}</strong></div></div><h2 className="source-title">数据源</h2><div className="source-list">{providers.length ? providers.map(provider => <div className="source-row" key={provider.key}><div><strong>{provider.name}</strong><span>{provider.restaurantCount} 家餐厅 · {provider.lastSyncedAt ? `更新于 ${new Date(provider.lastSyncedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}` : '等待同步'}</span></div><b className={provider.status}>{provider.status === 'authorized' ? '已授权' : provider.status === 'error' ? '异常' : '演示'}</b></div>) : <EmptyState title="暂无数据源" description="授权连接后会显示同步状态。" />}</div><div className="hint-box"><Gift size={20} /><p>林小呆只负责筛选与开盒。接入授权平台后，结果会显示实时信息并跳转至原平台完成下单。</p></div></section></aside>;
}

function OrderCard({ order, action }: { order: Order; action: (id: string, action: 'pay' | 'cancel') => void }) {
  return <div className="order-card"><div><h3>{order.restaurantName}</h3><span>{new Date(order.createdAt).toLocaleString('zh-CN')}</span></div><p>{order.items.map(item => `${item.name} x${item.quantity}`).join('，')}</p><div className="order-footer"><strong>{statusLabel[order.status]}</strong><b>¥{order.total}</b></div>{order.status === 'pending_payment' && <div className="order-actions"><button className="primary-button compact" onClick={() => action(order.id, 'pay')}><CreditCard size={16} />模拟支付</button><button className="outline-button" onClick={() => action(order.id, 'cancel')}>取消</button></div>}</div>;
}

function RequirementsPanel({ requirements }: { requirements: ExtractedRequirements }) {
  const rows = [['用餐人数', requirements.peopleCount ? `${requirements.peopleCount} 人` : '未提及'], ['预算', requirements.budget ? `¥${requirements.budget.min} - ¥${requirements.budget.max}` : '未提及'], ['菜系', requirements.cuisines?.join('、') || '不限'], ['辣度', requirements.spiceLevel ? spiceLabel[requirements.spiceLevel] : '不限'], ['忌口', requirements.mustAvoid?.join('、') || '无'], ['配送时间', requirements.deliveryTimeLimit ? `${requirements.deliveryTimeLimit} 分钟内` : '不限']];
  return <section className="panel-body"><h2>当前需求</h2><div className="requirement-list">{rows.map(([label, value]) => <div className="requirement-row" key={label}><span>{label}</span><strong>{value}</strong></div>)}</div><div className="hint-box"><Gift size={20} /><p>描述越具体，推荐越准确。也可以直接点盲盒，让小呆在预算与忌口范围内随机挑选。</p></div></section>;
}

function MerchantWorkspace({ user, onLogout }: { user: UserProfile; onLogout: () => void }) {
  const [dashboard, setDashboard] = useState<MerchantDashboard | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const refresh = () => Promise.all([api.merchantDashboard(), api.merchantOrders()]).then(([nextDashboard, nextOrders]) => { setDashboard(nextDashboard); setOrders(nextOrders); }).catch(reason => setError(reason instanceof Error ? reason.message : '无法读取商家数据'));
  useEffect(() => { refresh(); }, []);
  const advance = async (order: Order) => {
    const next = merchantActions[order.status]; if (!next) return;
    setBusyId(order.id);
    try { await api.updateMerchantOrder(order.id, next.action); await refresh(); } catch (reason) { setError(reason instanceof Error ? reason.message : '订单更新失败'); } finally { setBusyId(null); }
  };
  return <main className="merchant-shell"><header className="merchant-header"><div><div className="brand-inline"><Store size={22} />林小呆商家工作台</div><span>{dashboard?.restaurant.name || '正在加载店铺...'}</span></div><div className="merchant-user"><span>{user.name}</span><button className="outline-button" onClick={onLogout}><LogOut size={16} />退出</button></div></header><section className="merchant-content">{error && <p className="form-error">{error}</p>}{dashboard ? <><div className="metric-grid"><Metric label="今日订单" value={String(dashboard.metrics.todayOrders)} /><Metric label="今日营业额" value={`¥${dashboard.metrics.todayRevenue}`} /><Metric label="待接单" value={String(dashboard.metrics.pendingOrders)} /><Metric label="进行中" value={String(dashboard.metrics.activeOrders)} /></div><div className="merchant-section-title"><div><h1>订单中心</h1><p>支付完成后可接单，并按实际进度更新状态。</p></div><button className="outline-button" onClick={refresh}>刷新</button></div><div className="merchant-orders">{orders.length ? orders.map(order => <article className="merchant-order" key={order.id}><div><span className="order-id">#{order.id.slice(0, 8)}</span><h2>{order.items.map(item => `${item.name} x${item.quantity}`).join('，')}</h2><p>{order.address || '默认配送地址'} · {new Date(order.createdAt).toLocaleString('zh-CN')}</p></div><div className="merchant-order-action"><strong>{statusLabel[order.status]}</strong><b>¥{order.total}</b>{merchantActions[order.status] && <button className="primary-button compact" disabled={busyId === order.id} onClick={() => advance(order)}><CheckCircle2 size={16} />{merchantActions[order.status].label}</button>}</div></article>) : <EmptyState title="暂无订单" description="新订单会自动出现在这里。" />}</div></> : <div className="loading-state">正在读取店铺数据...</div>}</section></main>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="metric"><span>{label}</span><strong>{value}</strong></div>; }
function EmptyState({ title, description }: { title: string; description: string }) { return <div className="empty-state"><Sparkles size={22} /><strong>{title}</strong><span>{description}</span></div>; }
function summaryText(requirements: ExtractedRequirements) { const parts: string[] = []; if (requirements.peopleCount) parts.push(`${requirements.peopleCount} 人`); if (requirements.budget) parts.push(`¥${requirements.budget.max} 以内`); if (requirements.spiceLevel) parts.push(spiceLabel[requirements.spiceLevel]); if (requirements.cuisines?.length) parts.push(requirements.cuisines.join('、')); return parts.length ? `继续补充需求：${parts.join(' / ')}` : ''; }
