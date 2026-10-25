import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  Archive,
  Activity,
  Award,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Copy,
  CreditCard,
  Download,
  Ellipsis,
  Eye,
  EyeOff,
  Filter,
  Gift,
  GitBranch,
  LayoutDashboard,
  LogOut,
  Menu,
  Network,
  Plus,
  Pencil,
  Search,
  ShoppingCart,
  Settings2,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  RotateCcw,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  api,
  CommissionEntry,
  CommissionRate,
  AdminSettings,
  Member,
  MemberTreeNode,
  PayoutEntry,
  RankProgress,
  RankRule,
  RewardAward,
  SimulatedOrder,
  setAccessToken,
  SimulationResult,
} from '../client';

type Page = 'overview' | 'members' | 'network' | 'orders' | 'ranks' | 'commissions' | 'payouts' | 'ledger' | 'reports' | 'settings';

const navigation: { id: Page; label: string; icon: LucideIcon; group: string }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, group: 'WORKSPACE' },
  { id: 'members', label: 'Members', icon: Users, group: 'WORKSPACE' },
  { id: 'network', label: 'Referral network', icon: GitBranch, group: 'WORKSPACE' },
  { id: 'orders', label: 'Orders & volume', icon: ShoppingCart, group: 'OPERATIONS' },
  { id: 'commissions', label: 'Commission rules', icon: Gift, group: 'OPERATIONS' },
  { id: 'payouts', label: 'Payout management', icon: CreditCard, group: 'OPERATIONS' },
  { id: 'ledger', label: 'Commission ledger', icon: Wallet, group: 'OPERATIONS' },
  { id: 'ranks', label: 'Ranks & rewards', icon: Award, group: 'GROWTH' },
  { id: 'reports', label: 'Reports', icon: TrendingUp, group: 'SYSTEM' },
  { id: 'settings', label: 'Workspace settings', icon: Settings2, group: 'SYSTEM' },
];

type TrendPoint = { day: string; members: number; volume: number };

const chartSeries: Record<string, TrendPoint[]> = {
  '7 days': [
    { day: 'Mon', members: 8, volume: 390 },
    { day: 'Tue', members: 11, volume: 520 },
    { day: 'Wed', members: 10, volume: 465 },
    { day: 'Thu', members: 15, volume: 720 },
    { day: 'Fri', members: 18, volume: 810 },
    { day: 'Sat', members: 17, volume: 760 },
    { day: 'Sun', members: 24, volume: 1060 },
  ],
  '30 days': [
    { day: 'Week 1', members: 8, volume: 390 },
    { day: 'Week 2', members: 13, volume: 640 },
    { day: 'Week 3', members: 17, volume: 760 },
    { day: 'Week 4', members: 24, volume: 1060 },
  ],
  '90 days': [
    { day: 'Aug', members: 5, volume: 260 },
    { day: 'Sep', members: 14, volume: 690 },
    { day: 'Oct', members: 24, volume: 1060 },
  ],
};

const money = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

const shortDate = (value: string) =>
  new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(
    new Date(`${value.slice(0, 10)}T12:00:00`),
  );

function initials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('orbit-demo-token'));
  const [page, setPage] = useState<Page>('overview');
  const [members, setMembers] = useState<Member[]>([]);
  const [tree, setTree] = useState<MemberTreeNode[]>([]);
  const [rates, setRates] = useState<CommissionRate[]>([]);
  const [ledger, setLedger] = useState<CommissionEntry[]>([]);
  const [orders, setOrders] = useState<SimulatedOrder[]>([]);
  const [payouts, setPayouts] = useState<PayoutEntry[]>([]);
  const [rankRules, setRankRules] = useState<RankRule[]>([]);
  const [rankProgress, setRankProgress] = useState<RankProgress[]>([]);
  const [rewardAwards, setRewardAwards] = useState<RewardAward[]>([]);
  const [adminSettings, setAdminSettings] = useState<AdminSettings>({
    workspaceName: 'Northstar Network',
    adminName: 'Alex Demo',
    adminEmail: 'demo@unilevel.test',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const globalSearchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onExpired = () => {
      setToken(null);
      setAccessToken(null);
      setNotice('Your demo session expired. Sign in again to continue.');
    };
    window.addEventListener('demo-session-expired', onExpired);
    return () => window.removeEventListener('demo-session-expired', onExpired);
  }, []);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    let alive = true;
    setLoading(true);
    Promise.all([
      api<Member[]>('/members'),
      api<MemberTreeNode[]>('/members/tree'),
      api<CommissionRate[]>('/commissions/rates'),
      api<CommissionEntry[]>('/commissions/ledger'),
      api<SimulatedOrder[]>('/orders'),
      api<PayoutEntry[]>('/payouts'),
      api<RankRule[]>('/ranks/rules'),
      api<RankProgress[]>('/ranks/progress'),
      api<RewardAward[]>('/ranks/rewards'),
      api<AdminSettings>('/settings'),
    ])
      .then(([nextMembers, nextTree, nextRates, nextLedger, nextOrders, nextPayouts, nextRankRules, nextRankProgress, nextRewardAwards, nextSettings]) => {
        if (!alive) return;
        setMembers(nextMembers);
        setTree(nextTree);
        setRates(nextRates);
        setLedger(nextLedger);
        setOrders(nextOrders);
        setPayouts(nextPayouts);
        setRankRules(nextRankRules);
        setRankProgress(nextRankProgress);
        setRewardAwards(nextRewardAwards);
        setAdminSettings(nextSettings);
        setError('');
      })
      .catch((cause: unknown) => {
        if (alive) setError(cause instanceof Error ? cause.message : 'Could not load the workspace.');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [token]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(''), 3600);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [page, token]);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        event.key === '/' &&
        !(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || (target instanceof HTMLElement && target.isContentEditable))
      ) {
        event.preventDefault();
        globalSearchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, []);

  async function refreshData(): Promise<void> {
    const [nextMembers, nextTree, nextRates, nextLedger, nextOrders, nextPayouts, nextRankRules, nextRankProgress, nextRewardAwards, nextSettings] = await Promise.all([
      api<Member[]>('/members'),
      api<MemberTreeNode[]>('/members/tree'),
      api<CommissionRate[]>('/commissions/rates'),
      api<CommissionEntry[]>('/commissions/ledger'),
      api<SimulatedOrder[]>('/orders'),
      api<PayoutEntry[]>('/payouts'),
      api<RankRule[]>('/ranks/rules'),
      api<RankProgress[]>('/ranks/progress'),
      api<RewardAward[]>('/ranks/rewards'),
      api<AdminSettings>('/settings'),
    ]);
    setMembers(nextMembers);
    setTree(nextTree);
    setRates(nextRates);
    setLedger(nextLedger);
    setOrders(nextOrders);
    setPayouts(nextPayouts);
    setRankRules(nextRankRules);
    setRankProgress(nextRankProgress);
    setRewardAwards(nextRewardAwards);
    setAdminSettings(nextSettings);
  }

  function signOut(): void {
    setAccessToken(null);
    setToken(null);
    setAccountMenuOpen(false);
    setPage('overview');
  }

  function navigate(nextPage: Page): void {
    setPage(nextPage);
    setMobileNavOpen(false);
  }

  if (!token) {
    return (
      <>
        <LoginScreen
          onLogin={(accessToken) => {
            setAccessToken(accessToken);
            setToken(accessToken);
            setNotice('Welcome back. Your demo workspace is ready.');
          }}
        />
        <Toast message={notice} onClose={() => setNotice('')} />
      </>
    );
  }

  const activeMembers = members.filter((member) => member.status === 'active').length;
  const networkDepth = getNetworkDepth(members);
  const currentMonth = new Date().toISOString().slice(0, 7);
  const newThisMonth = members.filter((member) => member.joinedAt.startsWith(currentMonth)).length;
  const totalCommissions = ledger.reduce((sum, entry) => sum + entry.commissionAmount, 0);
  const title = navigation.find((item) => item.id === page)?.label ?? 'Overview';

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNavOpen ? 'sidebar-open' : ''}`}>
        <div className="brand-lockup">
          <div className="brand-mark"><Network size={20} strokeWidth={2.5} /></div>
          <span>orbit<span className="brand-period">.</span></span>
          <button className="icon-button sidebar-close" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)}><X size={19} /></button>
        </div>
        <button className="workspace-switcher" onClick={() => setNotice(`Current workspace: ${adminSettings.workspaceName}.`)}>
          <div className="workspace-avatar">{initials(adminSettings.workspaceName).slice(0, 1)}</div>
          <div className="workspace-text"><strong>{adminSettings.workspaceName}</strong><span>Demo workspace</span></div>
          <ChevronDown size={15} className="muted-icon" />
        </button>
        <nav className="main-nav" aria-label="Main navigation">
          {['WORKSPACE', 'OPERATIONS', 'GROWTH', 'SYSTEM'].map((group) => (
            <div className="nav-group" key={group}>
              <div className="nav-label">{group}</div>
              {navigation.filter((item) => item.group === group).map((item) => {
                const Icon = item.icon;
                return (
                  <button key={item.id} className={`nav-item ${page === item.id ? 'active' : ''}`} onClick={() => navigate(item.id)}>
                    <Icon size={17} strokeWidth={1.8} />
                    <span>{item.label}</span>
                    {item.id === 'members' && <span className="nav-count">{members.length}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button className="help-card" onClick={() => setNotice('Demo guide: add a member, explore the referral tree, then simulate an order.')}>
            <div className="help-icon"><CircleHelp size={16} /></div>
            <div><strong>Need a hand?</strong><span>Explore the demo guide</span></div>
            <ArrowRight size={15} />
          </button>
          <button className="profile-button" onClick={() => setAccountMenuOpen(!accountMenuOpen)}>
            <div className="profile-avatar">{initials(adminSettings.adminName)}</div>
            <div className="profile-meta"><strong>{adminSettings.adminName}</strong><span>Workspace admin</span></div>
            <Ellipsis size={18} className="muted-icon" />
          </button>
        </div>
      </aside>

      {mobileNavOpen && <button className="nav-scrim" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} />}

      <main className="main-shell">
        <header className="topbar">
          <div className="topbar-left">
            <button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setMobileNavOpen(true)}><Menu size={20} /></button>
            <div className="breadcrumb"><span>Workspace</span><ChevronRight size={14} /><strong>{title}</strong></div>
          </div>
          <div className="topbar-actions">
            <label className="global-search">
              <Search size={16} />
              <input
                aria-label="Search members"
                ref={globalSearchRef}
                placeholder="Search members..."
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  if (event.target.value) setPage('members');
                }}
              />
              <kbd>/</kbd>
            </label>
            <span className="topbar-divider" />
            <button className="icon-button notification-button" aria-label="Notifications" onClick={() => setNotice('You’re all caught up — there are no new notifications in the demo.')}><Bell size={18} /></button>
            <button className="topbar-avatar" aria-label="Account menu" onClick={() => setAccountMenuOpen(!accountMenuOpen)}>{initials(adminSettings.adminName)}</button>
            {accountMenuOpen && (
              <div className="account-menu">
                <span>Signed in as <strong>{adminSettings.adminEmail}</strong></span>
                <button onClick={signOut}><LogOut size={15} /> Sign out</button>
              </div>
            )}
          </div>
        </header>

        <div className="page-content">
          {error && <div className="inline-error"><ShieldCheck size={17} /><span>{error}</span><button onClick={() => window.location.reload()}>Reload</button></div>}
          {loading ? <LoadingState /> : (
            <>
              {page === 'overview' && (
                <OverviewPage
                  members={members}
                  ledger={ledger}
                  totalCommissions={totalCommissions}
                  activeMembers={activeMembers}
                  networkDepth={networkDepth}
                  newThisMonth={newThisMonth}
                  adminName={adminSettings.adminName}
                  onNavigate={navigate}
                  onAddMember={() => setAddMemberOpen(true)}
                />
              )}
              {page === 'members' && (
                <MembersPage
                  members={members}
                  networkDepth={networkDepth}
                  search={search}
                  onSearchChange={setSearch}
                  onAdd={() => setAddMemberOpen(true)}
                  onMemberChanged={(member, action) => {
                    setMembers((current) => current.map((item) => item.id === member.id ? member : item));
                    void refreshData().catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Could not refresh members.'));
                    setNotice(action === 'archive'
                      ? `${member.name} was archived; transaction history was preserved.`
                      : action === 'restore'
                        ? `${member.name} was restored.`
                        : action === 'status'
                          ? `${member.name} is now ${member.status}.`
                          : `${member.name} profile was updated.`);
                  }}
                />
              )}
              {page === 'network' && <NetworkPage tree={tree} members={members} networkDepth={networkDepth} />}
              {page === 'commissions' && (
                <CommissionsPage
                  rates={rates}
                  members={members}
                  onRatesUpdated={(nextRates) => {
                    setRates(nextRates);
                    setNotice('Commission rules saved.');
                  }}
                  onSimulationComplete={async (result) => {
                    await refreshData();
                    setNotice(`Simulation complete · ${money(result.totalAllocated)} allocated across the unilevel and pool streams.`);
                  }}
                />
              )}
              {page === 'orders' && <OrdersPage orders={orders} members={members} onSimulate={() => navigate('commissions')} />}
              {page === 'payouts' && <PayoutsPage payouts={payouts} members={members} onUpdated={refreshData} />}
              {page === 'ranks' && (
                <RanksPage
                  rules={rankRules}
                  progress={rankProgress}
                  awards={rewardAwards}
                  onSaved={async (nextRules) => {
                    const nextProgress = await api<RankProgress[]>('/ranks/progress');
                    const nextAwards = await api<RewardAward[]>('/ranks/rewards');
                    setRankRules(nextRules);
                    setRankProgress(nextProgress);
                    setRewardAwards(nextAwards);
                    setNotice('Rank and reward rules saved.');
                  }}
                  onAwardUpdated={async () => {
                    setRewardAwards(await api<RewardAward[]>('/ranks/rewards'));
                  }}
                />
              )}
              {page === 'ledger' && <LedgerPage ledger={ledger} members={members} />}
              {page === 'reports' && <ReportsPage members={members} orders={orders} payouts={payouts} progress={rankProgress} ledger={ledger} />}
              {page === 'settings' && (
                <SettingsPage
                  settings={adminSettings}
                  onSaved={(nextSettings) => {
                    setAdminSettings(nextSettings);
                    setNotice('Workspace and admin profile details saved.');
                  }}
                  onPasswordChanged={() => setNotice('Admin password updated. Use the new password next time you sign in.')}
                  onSignOut={signOut}
                />
              )}
            </>
          )}
        </div>
      </main>

      {addMemberOpen && (
        <MemberModal
          members={members}
          mode="create"
          onClose={() => setAddMemberOpen(false)}
          onSaved={(member) => {
            setMembers((current) => [member, ...current]);
            void refreshData().catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Could not refresh members.'));
            setAddMemberOpen(false);
            setNotice(`${member.name} was added with a $100 demo joining order.`);
          }}
        />
      )}
      <Toast message={notice} onClose={() => setNotice('')} />
    </div>
  );
}

function LoginScreen({ onLogin }: { onLogin: (token: string) => void }) {
  const [email, setEmail] = useState('');
  const [demoEmail, setDemoEmail] = useState('demo@unilevel.test');
  const [usesDefaultPassword, setUsesDefaultPassword] = useState(true);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [filled, setFilled] = useState(false);

  useEffect(() => {
    let alive = true;
    api<{ email: string; usesDefaultPassword: boolean }>('/auth/demo-account')
      .then((account) => {
        if (alive) {
          setDemoEmail(account.email);
          setUsesDefaultPassword(account.usesDefaultPassword);
        }
      })
      .catch(() => {
        if (alive) setError('Could not load the current demo account. You can still enter your sign-in details manually.');
      });
    return () => {
      alive = false;
    };
  }, []);

  function fillDemo(): void {
    setEmail(demoEmail);
    setPassword(usesDefaultPassword ? 'Demo123!' : '');
    setFilled(true);
    setError('');
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await api<{ accessToken: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      onLogin(result.accessToken);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Sign in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-shell">
      <section className="login-story">
        <div className="login-story-top">
          <div className="brand-lockup login-brand"><div className="brand-mark"><Network size={20} strokeWidth={2.5} /></div><span>orbit<span className="brand-period">.</span></span></div>
          <span className="story-badge"><Sparkles size={13} /> NETWORKS, IN FOCUS</span>
        </div>
        <div className="story-content">
          <div className="story-eyebrow"><span /> YOUR NETWORK, IN GOOD COMPANY</div>
          <h1>Build something<br />that <em>moves</em> people.</h1>
          <p>A clearer view of your community. Every connection, every milestone, all moving in the same direction.</p>
          <div className="story-visual">
            <div className="visual-orbit orbit-one" /><div className="visual-orbit orbit-two" />
            <div className="visual-node node-main"><Network size={21} /></div>
            <div className="visual-node node-a"><span>AM</span></div>
            <div className="visual-node node-b"><span>BC</span></div>
            <div className="visual-node node-c"><span>CD</span></div>
            <div className="visual-node node-d"><span>DS</span></div>
            <div className="visual-node node-e"><span>EL</span></div>
            <div className="visual-line line-a" /><div className="visual-line line-b" /><div className="visual-line line-c" />
            <div className="visual-label label-top">A network with momentum</div>
            <div className="visual-label label-bottom"><span className="live-dot" /> 8 members connected</div>
          </div>
        </div>
        <div className="story-footer"><span>BUILT FOR YOUR NEXT CHAPTER</span><span>01 — 04</span></div>
      </section>
      <section className="login-panel">
        <div className="login-panel-top"><span>New to Orbit?</span><button onClick={fillDemo}>Explore the demo <ArrowRight size={14} /></button></div>
        <div className="login-card">
          <div className="login-icon"><Network size={20} /></div>
          <div className="eyebrow">WELCOME BACK</div>
          <h2>Good to see you.</h2>
          <p>Sign in to your network workspace.</p>
          <button type="button" className={`demo-autofill ${filled ? 'filled' : ''}`} onClick={fillDemo}>
            <Sparkles size={16} />
            <span><strong>{filled ? 'Demo account details filled in' : 'Use demo account'}</strong><small>{usesDefaultPassword ? 'One click to fill your sign-in details' : 'Email filled; enter your updated password'}</small></span>
            {filled ? <Check size={17} /> : <ArrowRight size={16} />}
          </button>
          <div className="form-separator"><span>OR SIGN IN</span></div>
          <form onSubmit={handleSubmit}>
            <label className="field-label" htmlFor="login-email">Email address</label>
            <div className="input-wrap"><input id="login-email" type="email" autoComplete="username" placeholder="you@company.com" value={email} onChange={(event) => setEmail(event.target.value)} required /></div>
            <div className="field-label-row"><label className="field-label" htmlFor="login-password">Password</label><button className="text-link" type="button" onClick={fillDemo}>Use demo password</button></div>
            <div className="input-wrap password-wrap"><input id="login-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Enter your password" value={password} onChange={(event) => setPassword(event.target.value)} required /><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(!showPassword)}>{showPassword ? 'Hide' : 'Show'}</button></div>
            {error && <div className="form-error">{error}</div>}
            <button className="primary-button login-submit" type="submit" disabled={loading}>{loading ? <span className="spinner" /> : <>Sign in to workspace <ArrowRight size={16} /></>}</button>
          </form>
          <div className="demo-hint"><ShieldCheck size={15} /><span>After changing your password, sign in with your updated password. Demo data resets on restart.</span></div>
        </div>
        <div className="login-panel-footer"><span>© 2026 ORBIT NETWORKS</span><span>Privacy &nbsp; · &nbsp; Terms</span></div>
      </section>
    </div>
  );
}

function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: React.ReactNode; description: string; action?: React.ReactNode }) {
  return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{action && <div className="heading-action">{action}</div>}</div>;
}

function OverviewPage({
  members, ledger, totalCommissions, activeMembers, networkDepth, newThisMonth, adminName, onNavigate, onAddMember,
}: {
  members: Member[];
  ledger: CommissionEntry[];
  totalCommissions: number;
  activeMembers: number;
  networkDepth: number;
  newThisMonth: number;
  adminName: string;
  onNavigate: (page: Page) => void;
  onAddMember: () => void;
}) {
  const [period, setPeriod] = useState<keyof typeof chartSeries>('7 days');
  const memberById = useMemo(() => new Map(members.map((member) => [member.id, member])), [members]);
  const series = chartSeries[period];
  const recent = [...ledger].reverse().slice(0, 5);

  return (
    <>
      <PageHeading
        eyebrow="SUNDAY, OCTOBER 25, 2026"
        title={<>Good afternoon, {adminName.split(' ')[0]} <span className="heading-wave">✳</span></>}
        description="Here’s what’s happening across your network today."
        action={<><button className="secondary-button" onClick={() => onNavigate('network')}><GitBranch size={16} /> View network</button><button className="primary-button" onClick={onAddMember}><Plus size={17} /> Add member</button></>}
      />
      <div className="demo-banner"><div className="demo-banner-icon"><Sparkles size={17} /></div><div><strong>You’re exploring a live demo</strong><span>Mock members and simulated commissions. Your changes reset when the server restarts.</span></div><button onClick={() => onNavigate('commissions')}>Try a simulation <ArrowRight size={15} /></button></div>
      <section className="stat-grid">
        <StatCard label="Total members" value={members.length.toLocaleString()} change={`+${newThisMonth} this month`} icon={Users} tone="violet" trend={newThisMonth ? 'up' : 'neutral'} footer="Across your entire network" />
        <StatCard label="Active members" value={activeMembers.toLocaleString()} change={`${members.length ? Math.round((activeMembers / members.length) * 100) : 0}% of network`} icon={Activity} tone="green" trend="up" footer="Currently eligible" />
        <StatCard label="Income allocated" value={money(totalCommissions)} change={ledger.length ? `${ledger.length} entries` : 'No entries yet'} icon={Wallet} tone="amber" trend={ledger.length ? 'up' : 'neutral'} footer="Turnover pool + unilevel" />
        <StatCard label="Network depth" value={String(networkDepth).padStart(2, '0')} change="levels deep" icon={GitBranch} tone="blue" trend="neutral" footer="Your deepest referral line" />
      </section>
      <section className="overview-grid">
        <div className="panel growth-panel">
          <div className="panel-header"><div><div className="panel-title">Network growth</div><div className="panel-caption">Member momentum over time <span className="sample-tag">ILLUSTRATIVE</span></div></div><div className="segmented-control">{(['7 days', '30 days', '90 days'] as const).map((option) => <button key={option} className={period === option ? 'selected' : ''} onClick={() => setPeriod(option)}>{option}</button>)}</div></div>
          <div className="chart-legend"><span><i className="legend-dot violet-dot" />Network growth</span><span><i className="legend-dot pale-dot" />Community activity</span><span className="chart-period"><TrendingUp size={14} /> Growth trend</span></div>
          <GrowthChart data={series} />
          <div className="chart-footnote">Illustrative trend data for the demo · not live historical activity</div>
        </div>
        <div className="panel composition-panel">
          <div className="panel-header"><div><div className="panel-title">Member health</div><div className="panel-caption">Current network status</div></div><button className="icon-button subtle"><Ellipsis size={19} /></button></div>
          <div className="health-chart-wrap"><div className="health-chart"><HealthDonut active={activeMembers} total={members.length} /></div><div className="health-chart-center"><strong>{members.length}</strong><span>members</span></div></div>
          <div className="health-legend"><div><span><i className="legend-dot violet-dot" />Active members</span><strong>{activeMembers}</strong></div><div><span><i className="legend-dot grey-dot" />Inactive members</span><strong>{members.length - activeMembers}</strong></div></div>
          <button className="panel-link" onClick={() => onNavigate('members')}>View all members <ArrowRight size={15} /></button>
        </div>
      </section>
      <section className="bottom-grid">
        <div className="panel recent-panel">
          <div className="panel-header"><div><div className="panel-title">Recent income activity</div><div className="panel-caption">Latest simulated allocations</div></div><button className="panel-link inline-link" onClick={() => onNavigate('ledger')}>Full ledger <ArrowRight size={14} /></button></div>
          {recent.length ? <div className="mini-table"><div className="mini-table-head"><span>MEMBER</span><span>REFERENCE</span><span>INCOME TYPE</span><span>AMOUNT</span></div>{recent.map((entry) => <div className="mini-table-row" key={entry.id}><div className="member-cell"><Avatar name={memberById.get(entry.beneficiaryMemberId)?.name ?? entry.beneficiaryMemberId} /><div><strong>{memberById.get(entry.beneficiaryMemberId)?.name ?? entry.beneficiaryMemberId}</strong><small>{shortDate(entry.createdAt)}</small></div></div><span className="ref-cell">{entry.referenceId}</span><span>{entry.incomeType === 'turnover-pool' ? '20% pool' : entry.incomeType === 'rank-reward' ? 'Rank reward' : `Level ${entry.level}`}</span><strong className="amount-cell">{money(entry.commissionAmount)}</strong></div>)}</div> : <EmptyState icon={Wallet} title="Your ledger is ready" message="Run a commission simulation to see how income flows through your network." action={<button className="text-action" onClick={() => onNavigate('commissions')}>Run your first simulation <ArrowRight size={14} /></button>} />}
        </div>
        <div className="panel quick-panel">
          <div className="panel-header"><div><div className="panel-title">Quick actions</div><div className="panel-caption">Keep your network moving</div></div></div>
          <button className="quick-action" onClick={onAddMember}><span className="quick-icon quick-violet"><Plus size={17} /></span><span><strong>Invite a member</strong><small>Grow your referral network</small></span><ArrowRight size={15} /></button>
          <button className="quick-action" onClick={() => onNavigate('commissions')}><span className="quick-icon quick-amber"><Settings2 size={17} /></span><span><strong>Review commission rules</strong><small>Configure rates by level</small></span><ArrowRight size={15} /></button>
          <button className="quick-action" onClick={() => onNavigate('network')}><span className="quick-icon quick-blue"><GitBranch size={17} /></span><span><strong>Explore your network</strong><small>See every connection</small></span><ArrowRight size={15} /></button>
          <div className="quick-note"><ShieldCheck size={15} /><span>Demo data is stored in memory and resets on restart.</span></div>
        </div>
      </section>
    </>
  );
}

function GrowthChart({ data }: { data: TrendPoint[] }) {
  const x = (index: number) => 52 + (624 * index) / Math.max(1, data.length - 1);
  const yMembers = (value: number) => 182 - (value / 30) * 145;
  const yVolume = (value: number) => 182 - (value / 1200) * 145;
  const memberPath = data.map((point, index) => `${index === 0 ? 'M' : 'L'} ${x(index)} ${yMembers(point.members)}`).join(' ');
  const volumePath = data.map((point, index) => `${index === 0 ? 'M' : 'L'} ${x(index)} ${yVolume(point.volume)}`).join(' ');
  const memberArea = `${memberPath} L ${x(data.length - 1)} 182 L ${x(0)} 182 Z`;
  const volumeArea = `${volumePath} L ${x(data.length - 1)} 182 L ${x(0)} 182 Z`;

  return (
    <div className="growth-chart">
      <svg className="growth-svg" viewBox="0 0 720 225" role="img" aria-label="Illustrative network growth and community activity chart">
        <defs>
          <linearGradient id="memberGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7868e8" stopOpacity=".23" /><stop offset="100%" stopColor="#7868e8" stopOpacity="0" /></linearGradient>
          <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#b8b3f6" stopOpacity=".16" /><stop offset="100%" stopColor="#b8b3f6" stopOpacity="0" /></linearGradient>
        </defs>
        {[0, 10, 20, 30].map((tick) => {
          const y = yMembers(tick);
          return <g key={tick}><line x1="48" x2="678" y1={y} y2={y} stroke="#edf0f5" strokeDasharray="4 5" /><text x="36" y={y + 3} textAnchor="end" fill="#9298a8" fontSize="10">{tick}</text><text x="686" y={y + 3} fill="#aaa5cc" fontSize="9">${tick * 40}</text></g>;
        })}
        <path d={volumeArea} fill="url(#volumeGradient)" />
        <path d={memberArea} fill="url(#memberGradient)" />
        <path d={volumePath} fill="none" stroke="#c9c5fa" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        <path d={memberPath} fill="none" stroke="#7768e8" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {data.map((point, index) => <g key={point.day}><circle cx={x(index)} cy={yMembers(point.members)} r="3.5" fill="#fff" stroke="#7768e8" strokeWidth="2"><title>{`${point.day}: ${point.members} members · ${money(point.volume)} activity`}</title></circle><text x={x(index)} y="211" textAnchor="middle" fill="#9298a8" fontSize="10">{point.day}</text></g>)}
      </svg>
    </div>
  );
}

function HealthDonut({ active, total }: { active: number; total: number }) {
  const circumference = 2 * Math.PI * 68;
  const activeLength = total ? (active / total) * circumference : 0;
  const inactiveLength = circumference - activeLength;

  return (
    <svg viewBox="0 0 180 180" role="img" aria-label={`${active} active and ${total - active} inactive members`}>
      <circle cx="90" cy="90" r="68" fill="none" stroke="#f0f0f5" strokeWidth="15" />
      {total > 0 && <>
        {inactiveLength > 0 && <circle cx="90" cy="90" r="68" fill="none" stroke="#e5e6ee" strokeWidth="15" strokeDasharray={`${inactiveLength} ${circumference - inactiveLength}`} strokeDashoffset={-activeLength} transform="rotate(-90 90 90)" />}
        {activeLength > 0 && <circle cx="90" cy="90" r="68" fill="none" stroke="#7168e8" strokeWidth="15" strokeDasharray={`${activeLength} ${circumference - activeLength}`} transform="rotate(-90 90 90)" />}
      </>}
    </svg>
  );
}

function StatCard({ label, value, change, icon: Icon, tone, trend, footer }: { label: string; value: string; change: string; icon: LucideIcon; tone: string; trend: 'up' | 'down' | 'neutral'; footer: string }) {
  return <div className="stat-card"><div className="stat-top"><span>{label}</span><span className={`stat-icon ${tone}`}><Icon size={17} /></span></div><div className="stat-value">{value}</div><div className={`stat-change ${trend}`}>{trend === 'down' ? <ArrowDownRight size={14} /> : trend === 'up' ? <ArrowUpRight size={14} /> : <span className="neutral-dot" />}{change}</div><div className="stat-footer">{footer}</div></div>;
}

function MembersPage({ members, networkDepth, search, onSearchChange, onAdd, onMemberChanged }: { members: Member[]; networkDepth: number; search: string; onSearchChange: (value: string) => void; onAdd: () => void; onMemberChanged: (member: Member, action: 'profile' | 'status' | 'archive' | 'restore') => void }) {
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'archived'>('all');
  const [changingId, setChangingId] = useState('');
  const [mutationError, setMutationError] = useState('');
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const filtered = members.filter((member) => {
    const matchesText = `${member.name} ${member.email} ${member.id}`.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all'
      || (statusFilter === 'archived' ? Boolean(member.archivedAt) : !member.archivedAt && member.status === statusFilter);
    return matchesText && matchesStatus;
  });

  async function toggleStatus(member: Member): Promise<void> {
    setChangingId(member.id);
    try {
      const updated = await api<Member>(`/members/${member.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: member.status === 'active' ? 'inactive' : 'active' }),
      });
      onMemberChanged(updated, 'status');
    } catch (cause) {
      setMutationError(cause instanceof Error ? cause.message : 'Could not update member status.');
    } finally {
      setChangingId('');
    }
  }

  async function archiveMember(member: Member): Promise<void> {
    if (!window.confirm(`Archive ${member.name}? Their account will be deactivated, while orders and transaction history remain available.`)) return;
    setChangingId(member.id);
    try {
      const updated = await api<Member>(`/members/${member.id}`, { method: 'DELETE' });
      onMemberChanged(updated, 'archive');
    } catch (cause) {
      setMutationError(cause instanceof Error ? cause.message : 'Could not archive this member.');
    } finally {
      setChangingId('');
    }
  }

  async function restoreMember(member: Member): Promise<void> {
    setChangingId(member.id);
    try {
      const updated = await api<Member>(`/members/${member.id}/restore`, { method: 'PATCH' });
      onMemberChanged(updated, 'restore');
    } catch (cause) {
      setMutationError(cause instanceof Error ? cause.message : 'Could not restore this member.');
    } finally {
      setChangingId('');
    }
  }

  return <>
    <PageHeading eyebrow="PEOPLE & COMMUNITY" title="Members" description="Manage your community, follow referrals, and keep your network growing." action={<button className="primary-button" onClick={onAdd}><Plus size={17} /> Add member</button>} />
    <section className="stat-strip"><div><Users size={17} /><span>Total members</span><strong>{members.length}</strong></div><div><span className="tiny-status active-status" /><span>Active</span><strong>{members.filter((member) => !member.archivedAt && member.status === 'active').length}</strong></div><div><span className="tiny-status inactive-status" /><span>Inactive</span><strong>{members.filter((member) => !member.archivedAt && member.status === 'inactive').length}</strong></div><div><GitBranch size={17} /><span>Network depth</span><strong>{networkDepth} levels</strong></div></section>
    <div className="panel members-panel">
      {mutationError && <div className="inline-error"><ShieldCheck size={17} /><span>{mutationError}</span><button onClick={() => setMutationError('')}>Dismiss</button></div>}
      <div className="table-toolbar"><div><div className="panel-title">Member directory <span className="table-count">{filtered.length}</span></div><div className="panel-caption">Create, update, deactivate, archive, and restore members</div></div><div className="table-controls"><label className="table-search"><Search size={15} /><input placeholder="Search members" value={search} onChange={(event) => onSearchChange(event.target.value)} /></label><label className="filter-select"><Filter size={15} /><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}><option value="all">All members</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="archived">Archived</option></select></label><button className="secondary-button export-button" onClick={() => exportMembers(filtered)}><Download size={15} /> Export</button></div></div>
      {filtered.length ? <div className="data-table-wrap"><table className="data-table"><thead><tr><th>MEMBER</th><th>MEMBER ID</th><th>REFERRED BY</th><th>JOINED</th><th>STATUS</th><th><span className="sr-only">Member actions</span></th></tr></thead><tbody>{filtered.map((member, index) => <tr key={member.id} className={member.archivedAt ? 'archived-member-row' : ''}><td><div className="member-cell"><Avatar name={member.name} index={index} status={member.status} /><div><strong>{member.name}</strong><small>{member.email}</small></div></div></td><td className="id-cell">{member.id}</td><td>{members.find((candidate) => candidate.id === member.sponsorId)?.name ?? <span className="muted-text">Direct / root</span>}</td><td>{shortDate(member.joinedAt)}</td><td><span className={`status-pill ${member.archivedAt ? 'archived' : member.status}`}><i />{member.archivedAt ? 'Archived' : member.status}</span></td><td><div className="member-row-actions">{changingId === member.id ? <span className="spinner dark-spinner small-spinner" /> : member.archivedAt ? <button className="row-action" aria-label={`Restore ${member.name}`} title="Restore member" onClick={() => void restoreMember(member)}><RotateCcw size={16} /></button> : <><button className="row-action" aria-label={`Edit ${member.name}`} title="Edit profile" onClick={() => setEditingMember(member)}><Pencil size={15} /></button><button className="row-action" aria-label={`${member.status === 'active' ? 'Deactivate' : 'Activate'} ${member.name}`} title={member.status === 'active' ? 'Deactivate' : 'Activate'} onClick={() => void toggleStatus(member)}><Ellipsis size={17} /></button><button className="row-action archive-action" aria-label={`Archive ${member.name}`} title="Archive member" onClick={() => void archiveMember(member)}><Archive size={15} /></button></>}</div></td></tr>)}</tbody></table></div> : <EmptyState icon={Search} title="No members found" message="Try a different search or status filter." action={<button className="text-action" onClick={() => { onSearchChange(''); setStatusFilter('all'); }}>Clear filters</button>} />}
      <div className="table-footer"><span>Showing <strong>{filtered.length}</strong> of <strong>{members.length}</strong> members</span><span>Archive preserves referral and financial history</span></div>
    </div>
    {editingMember && <MemberModal key={editingMember.id} members={members} member={editingMember} mode="edit" onClose={() => setEditingMember(null)} onSaved={(member) => { onMemberChanged(member, 'profile'); setEditingMember(null); }} />}
  </>;
}

function exportMembers(members: Member[]): void {
  const rows = [['ID', 'Name', 'Email', 'Sponsor ID', 'Joined', 'Status'], ...members.map((member) => [member.id, member.name, member.email, member.sponsorId ?? '', member.joinedAt, member.archivedAt ? 'archived' : member.status])];
  const csv = rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'orbit-members.csv';
  link.click();
  URL.revokeObjectURL(url);
}

function NetworkPage({ tree, members, networkDepth }: { tree: MemberTreeNode[]; members: Member[]; networkDepth: number }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const memberById = useMemo(() => new Map(members.map((member) => [member.id, member])), [members]);
  const selectedMember = selected ? memberById.get(selected) : undefined;

  async function copyReferral(member: Member): Promise<void> {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/join?ref=${member.id}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return <>
    <PageHeading eyebrow="YOUR COMMUNITY" title="Referral network" description="A living view of every connection, from your first member to the latest branch." action={<div className="tree-summary"><span><i className="legend-dot violet-dot" />{members.length} members</span><span><GitBranch size={15} />{networkDepth} levels</span></div>} />
    <div className="network-layout">
      <section className="panel network-panel">
        <div className="panel-header network-panel-header"><div><div className="panel-title">Network map</div><div className="panel-caption">Click a member to see their referral details</div></div><div className="map-legend"><span><i className="legend-dot violet-dot" />Active</span><span><i className="legend-dot grey-dot" />Inactive</span></div></div>
        <div className="network-canvas"><div className="tree-root-label">TOP OF NETWORK <span>01</span></div>{tree.map((node) => <TreeNode key={node.id} node={node} depth={0} selected={selected} onSelect={setSelected} />)}</div>
        <div className="network-foot"><span><Sparkles size={14} /> Your community is growing. Every connection starts with a conversation.</span><span>MOCK NETWORK · {members.length} MEMBERS</span></div>
      </section>
      <aside className="panel member-detail-panel">
        {selectedMember ? <>
          <div className="detail-top"><span className="eyebrow">MEMBER PROFILE</span><button className="icon-button subtle" aria-label="Clear selection" onClick={() => setSelected(null)}><X size={17} /></button></div>
          <div className="detail-profile"><Avatar name={selectedMember.name} large /><h3>{selectedMember.name}</h3><span className="detail-email">{selectedMember.email}</span><span className={`status-pill ${selectedMember.archivedAt ? 'archived' : selectedMember.status}`}><i />{selectedMember.archivedAt ? 'Archived' : selectedMember.status}</span></div>
          <div className="detail-divider" />
          <div className="detail-metadata"><div><span>MEMBER ID</span><strong>{selectedMember.id}</strong></div><div><span>JOINED</span><strong>{shortDate(selectedMember.joinedAt)}</strong></div><div><span>SPONSORED BY</span><strong>{memberById.get(selectedMember.sponsorId ?? '')?.name ?? 'Network owner'}</strong></div><div><span>DIRECT REFERRALS</span><strong>{members.filter((member) => member.sponsorId === selectedMember.id).length}</strong></div></div>
          <button className="secondary-button copy-referral" onClick={() => void copyReferral(selectedMember)}>{copied ? <Check size={15} /> : <Copy size={15} />}{copied ? 'Referral link copied' : 'Copy referral link'}</button>
          <div className="detail-note">Referral links are for this demo only. A public registration flow is not connected.</div>
        </> : <div className="detail-empty"><div className="detail-empty-icon"><GitBranch size={21} /></div><strong>Explore your community</strong><span>Select any member on the map to see where they sit in the network.</span><div className="detail-tip"><Sparkles size={15} /> Follow the branches to discover every level.</div></div>}
      </aside>
    </div>
  </>;
}

function TreeNode({ node, depth, selected, onSelect }: { node: MemberTreeNode; depth: number; selected: string | null; onSelect: (id: string) => void }) {
  const [expanded, setExpanded] = useState(true);
  return <div className={`tree-node depth-${Math.min(depth, 3)}`}>
    <div className="tree-branch">
      {depth > 0 && <span className="branch-stem" />}
      <button className={`tree-member ${selected === node.id ? 'selected' : ''}`} onClick={() => onSelect(node.id)}>
        <Avatar name={node.name} status={node.status} />
        <span className="tree-member-info"><strong>{node.name}</strong><small>{node.id}</small></span>
        <span className={`tree-status ${node.archivedAt ? 'archived' : node.status}`} title={node.archivedAt ? 'Archived member' : node.status} />
        {node.children.length > 0 && <span className="tree-child-count">{node.children.length}</span>}
      </button>
      {node.children.length > 0 && <button className="tree-expand" aria-label={expanded ? 'Collapse referrals' : 'Expand referrals'} onClick={() => setExpanded(!expanded)}>{expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</button>}
    </div>
    {expanded && node.children.length > 0 && <div className="tree-children">{node.children.map((child) => <TreeNode key={child.id} node={child} depth={depth + 1} selected={selected} onSelect={onSelect} />)}</div>}
  </div>;
}

function CommissionsPage({ rates, members, onRatesUpdated, onSimulationComplete }: { rates: CommissionRate[]; members: Member[]; onRatesUpdated: (rates: CommissionRate[]) => void; onSimulationComplete: (result: SimulationResult) => Promise<void> }) {
  const [draftRates, setDraftRates] = useState<number[]>(rates.map((rate) => rate.rateBps));
  const [saving, setSaving] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [sourceMemberId, setSourceMemberId] = useState('');
  const [amount, setAmount] = useState('125.00');
  const [referenceId, setReferenceId] = useState('');
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const sourceMember = members.find((member) => member.id === sourceMemberId);
  const preview = sourceMember
    ? previewCommissions(sourceMemberId, members, draftRates, Number(amount || 0))
    : { count: 0, commissionTotal: 0, poolTotal: 0, totalAllocated: 0 };
  const unilevelRateTotal = draftRates.reduce((total, rateBps) => total + rateBps, 0);

  useEffect(() => setDraftRates(rates.map((rate) => rate.rateBps)), [rates]);

  async function saveRates(): Promise<void> {
    setSaving(true);
    setError('');
    try {
      const response = await api<CommissionRate[]>('/commissions/rates', {
        method: 'PUT',
        body: JSON.stringify({ rates: draftRates.map((rateBps) => ({ rateBps })) }),
      });
      onRatesUpdated(response);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2200);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save commission rules.');
    } finally {
      setSaving(false);
    }
  }

  async function simulate(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setSimulating(true);
    setError('');
    setResult(null);
    try {
      const response = await api<SimulationResult>('/commissions/simulate', {
        method: 'POST',
        body: JSON.stringify({ sourceMemberId, amount: Number(amount), referenceId }),
      });
      setResult(response);
      await onSimulationComplete(response);
      setReferenceId('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Simulation failed.');
    } finally {
      setSimulating(false);
    }
  }

  function changeRate(index: number, value: string): void {
    const parsed = Number(value);
    setDraftRates((current) => current.map((rate, currentIndex) => currentIndex === index ? (Number.isFinite(parsed) ? Math.min(80, Math.max(0, parsed)) * 100 : 0) : rate));
  }

  return <>
    <PageHeading eyebrow="PAYOUT CONFIGURATION" title="Commission rules" description="Define how qualifying activity rewards each eligible level in your network." action={<span className="configuration-badge"><ShieldCheck size={15} /> Demo configuration</span>} />
    <div className="rules-layout">
      <section className="panel rules-panel">
        <div className="panel-header"><div><div className="panel-title">Unilevel commission structure</div><div className="panel-caption">Percent of qualifying order volume allocated to each active upline</div></div><span className="rules-version"><span /> LIVE PREVIEW</span></div>
        <div className="rules-info"><div className="rules-info-icon"><Activity size={17} /></div><p><strong>One $100 demo joining amount · no deposit, withdrawal, or service charges.</strong> Every order places 20% into an equal-share pool for active uplines (up to 10 levels). The separate unilevel rates below apply to each eligible upline's level; inactive members do not receive a share and do not shift levels.</p></div>
        <div className="rate-list">{draftRates.map((rateBps, index) => <div className="rate-row" key={index}><div className="rate-level-icon">{index + 1}</div><div className="rate-level-name"><strong>Level {index + 1}</strong><span>{index === 0 ? 'Direct sponsor' : `${index} level${index === 1 ? '' : 's'} above`}</span></div><div className="rate-track"><span style={{ width: `${Math.min(100, Math.max(3, rateBps / 100))}%` }} /></div><div className="rate-input-wrap"><input aria-label={`Level ${index + 1} commission percent`} type="number" min="0" max="80" step="0.1" value={rateBps / 100} onChange={(event) => changeRate(index, event.target.value)} /><span>%</span></div><span className="rate-estimate">{money(100 * rateBps / 10000)} <small>/ $100</small></span></div>)}</div>
        <div className="rates-footer"><span>20% pool + {unilevelRateTotal / 100}% unilevel · total plan cap 100%</span><button className="primary-button" onClick={() => void saveRates()} disabled={saving || draftRates.length !== 10 || unilevelRateTotal > 8000}>{saving ? <span className="spinner" /> : <Check size={16} />}{saved ? 'Rules saved' : 'Save commission rules'}</button></div>
      </section>
      <aside className="panel simulation-panel">
        <div className="simulation-heading"><div className="simulation-icon"><Sparkles size={18} /></div><div><div className="panel-title">Try a simulation</div><div className="panel-caption">Preview an order through your network</div></div></div>
        <form className="simulation-form" onSubmit={(event) => void simulate(event)}>
          <label className="field-label" htmlFor="source-member">Member who made the order</label>
          <select id="source-member" className="form-control" required value={sourceMemberId} onChange={(event) => setSourceMemberId(event.target.value)}><option value="">Choose a member...</option>{members.map((member) => <option key={member.id} value={member.id}>{member.name} · {member.id}{member.status === 'inactive' ? ' (inactive)' : ''}</option>)}</select>
          <label className="field-label" htmlFor="order-amount">Qualifying order amount</label>
          <div className="money-input"><span>$</span><input id="order-amount" type="number" min="0.01" max="1000000" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} required /></div>
          <label className="field-label" htmlFor="reference-id">Order reference</label>
          <input id="reference-id" className="form-control" value={referenceId} onChange={(event) => setReferenceId(event.target.value)} placeholder="e.g. order-demo-0042" pattern="[A-Za-z0-9_\-]{3,64}" required />
          <div className="simulation-summary"><div><span>Active upline pool recipients</span><strong>{sourceMember ? preview.count : '—'}</strong></div><div><span>Unilevel commissions</span><strong>{money(preview.commissionTotal)}</strong></div><div><span>20% turnover pool</span><strong>{money(preview.poolTotal)}</strong></div><div><span>Total allocated</span><strong className="estimated-total">{money(preview.totalAllocated)}</strong></div></div>
          {error && <div className="form-error">{error}</div>}
          <button className="primary-button simulation-submit" type="submit" disabled={simulating || !sourceMemberId || unilevelRateTotal > 8000}>{simulating ? <span className="spinner" /> : <Sparkles size={16} />}{simulating ? 'Calculating...' : 'Simulate order'}</button>
          <div className="simulation-disclaimer"><ShieldCheck size={14} /> Simulations only · No real funds are moved</div>
        </form>
        {result && <div className="simulation-result"><div className="result-success"><Check size={15} /><strong>Simulation complete</strong><span>{money(result.totalAllocated)} total allocated</span></div>{result.commissions.map((entry) => <div className="result-line" key={entry.id}><span>Unilevel · Level {entry.level} · {members.find((member) => member.id === entry.beneficiaryMemberId)?.name ?? entry.beneficiaryMemberId}</span><strong>{money(entry.commissionAmount)}</strong></div>)}{result.turnoverPoolEntries.map((entry) => <div className="result-line" key={entry.id}><span>Pool share · Level {entry.level} · {members.find((member) => member.id === entry.beneficiaryMemberId)?.name ?? entry.beneficiaryMemberId}</span><strong>{money(entry.commissionAmount)}</strong></div>)}{!result.commissions.length && !result.turnoverPoolEntries.length && <div className="result-empty">No active eligible uplines were found for this order. The 20% pool remains undistributed.</div>}</div>}
      </aside>
    </div>
    <div className="compliance-note"><CircleHelp size={16} /><span><strong>For demonstration only.</strong> Rates and commission entries live in memory. This demo does not calculate taxes, refunds, chargebacks, or pay out funds.</span></div>
  </>;
}

function previewCommissions(memberId: string, members: Member[], rates: number[], amount: number): { count: number; commissionTotal: number; poolTotal: number; totalAllocated: number } {
  const byId = new Map(members.map((member) => [member.id, member]));
  let current = byId.get(memberId);
  let level = 0;
  let count = 0;
  let commissionCents = 0;
  while (current?.sponsorId && level < 10) {
    current = byId.get(current.sponsorId);
    if (!current) break;
    if (current.status === 'active' && rates[level] > 0) {
      commissionCents += Math.round((Math.round(amount * 100) * rates[level]) / 10000);
    }
    if (current.status === 'active') count += 1;
    level += 1;
  }
  const poolTotal = count ? Math.round((Math.round(amount * 100) * 2000) / 10000) / 100 : 0;
  const commissionTotal = commissionCents / 100;
  return { count, commissionTotal, poolTotal, totalAllocated: commissionTotal + poolTotal };
}

function getNetworkDepth(members: Member[]): number {
  const byId = new Map(members.map((member) => [member.id, member]));
  return members.reduce((maximum, member) => {
    const visited = new Set<string>([member.id]);
    let current = member;
    let depth = 0;
    while (current.sponsorId && !visited.has(current.sponsorId)) {
      visited.add(current.sponsorId);
      const sponsor = byId.get(current.sponsorId);
      if (!sponsor) break;
      depth += 1;
      current = sponsor;
    }
    return Math.max(maximum, depth);
  }, 0);
}

function LedgerPage({ ledger, members }: { ledger: CommissionEntry[]; members: Member[] }) {
  const [search, setSearch] = useState('');
  const [level, setLevel] = useState('all');
  const memberById = useMemo(() => new Map(members.map((member) => [member.id, member])), [members]);
  const entries = [...ledger].reverse().filter((entry) => {
    const text = `${entry.referenceId} ${memberById.get(entry.beneficiaryMemberId)?.name ?? ''} ${entry.beneficiaryMemberId}`.toLowerCase();
    return text.includes(search.toLowerCase()) && (level === 'all' || entry.level === Number(level));
  });
  const total = ledger.reduce((sum, entry) => sum + entry.commissionAmount, 0);

  return <>
    <PageHeading eyebrow="TRANSACTION HISTORY" title="Commission ledger" description="A transparent ledger for the 20% team pool and ten-level unilevel income." action={<span className="ledger-state"><span /> In-memory demo ledger</span>} />
    <section className="ledger-kpis"><div className="ledger-kpi"><span>Total income allocated</span><strong>{money(total)}</strong><small>Across {ledger.length} income entries</small></div><div className="ledger-kpi"><span>Unique order references</span><strong>{new Set(ledger.map((entry) => entry.referenceId)).size}</strong><small>Each reference can be simulated once</small></div><div className="ledger-kpi"><span>Average allocation</span><strong>{money(ledger.length ? total / ledger.length : 0)}</strong><small>Per eligible income entry</small></div></section>
    <div className="panel ledger-panel"><div className="table-toolbar"><div><div className="panel-title">All income allocations <span className="table-count">{entries.length}</span></div><div className="panel-caption">Turnover-pool shares and per-level commissions</div></div><div className="table-controls"><label className="table-search"><Search size={15} /><input placeholder="Search order or member" value={search} onChange={(event) => setSearch(event.target.value)} /></label><label className="filter-select"><Filter size={15} /><select value={level} onChange={(event) => setLevel(event.target.value)}><option value="all">All levels</option>{[...new Set(ledger.map((entry) => entry.level))].sort().map((value) => <option key={value} value={value}>Level {value}</option>)}</select></label></div></div>
      {entries.length ? <div className="data-table-wrap"><table className="data-table ledger-table"><thead><tr><th>BENEFICIARY</th><th>ORDER REFERENCE</th><th>SOURCE MEMBER</th><th>INCOME STREAM</th><th>LEVEL</th><th>QUALIFYING AMOUNT</th><th>RATE / SHARE</th><th>AMOUNT</th><th>DATE</th></tr></thead><tbody>{entries.map((entry) => { const beneficiary = memberById.get(entry.beneficiaryMemberId); const source = memberById.get(entry.sourceMemberId); return <tr key={entry.id}><td><div className="member-cell"><Avatar name={beneficiary?.name ?? entry.beneficiaryMemberId} /><div><strong>{beneficiary?.name ?? entry.beneficiaryMemberId}</strong><small>{entry.beneficiaryMemberId}</small></div></div></td><td className="id-cell">{entry.referenceId}</td><td>{source?.name ?? entry.sourceMemberId}</td><td>{entry.incomeType === 'turnover-pool' ? '20% team pool' : entry.incomeType === 'rank-reward' ? 'Rank reward' : 'Unilevel'}</td><td><span className="level-pill">{entry.incomeType === 'rank-reward' ? 'Reward' : `Level ${entry.level}`}</span></td><td>{money(entry.eligibleAmount)}</td><td>{entry.incomeType === 'turnover-pool' ? 'Equal share' : entry.incomeType === 'rank-reward' ? 'Milestone' : `${(entry.rateBps / 100).toFixed(2)}%`}</td><td className="ledger-amount">{money(entry.commissionAmount)}</td><td>{shortDate(entry.createdAt)}</td></tr>; })}</tbody></table></div> : <EmptyState icon={CreditCard} title="No income entries yet" message={search || level !== 'all' ? 'No entries match those filters. Try adjusting your search.' : 'Join a member or simulate an order to see turnover income here and rank rewards when milestones are earned.'} action={<button className="text-action" onClick={() => { setSearch(''); setLevel('all'); }}>Clear filters</button>} />}
      <div className="table-footer"><span>Showing <strong>{entries.length}</strong> of <strong>{ledger.length}</strong> entries</span><span>Ledger resets when the demo server restarts</span></div>
    </div>
  </>;
}

function OrdersPage({ orders, members, onSimulate }: { orders: SimulatedOrder[]; members: Member[]; onSimulate: () => void }) {
  const [search, setSearch] = useState('');
  const memberById = useMemo(() => new Map(members.map((member) => [member.id, member])), [members]);
  const filtered = [...orders].reverse().filter((order) => {
    const source = memberById.get(order.sourceMemberId);
    return `${order.referenceId} ${source?.name ?? ''} ${order.sourceMemberId}`.toLowerCase().includes(search.toLowerCase());
  });
  const volume = orders.reduce((sum, order) => sum + order.qualifyingAmount, 0);
  const allocated = orders.reduce((sum, order) => sum + order.commissionTotal, 0);
  const pool = orders.reduce((sum, order) => sum + order.turnoverPoolTotal, 0);

  return <>
    <PageHeading eyebrow="SALES ACTIVITY" title="Orders & volume" description="Review qualifying demo orders and the network volume generated by each simulation." action={<button className="primary-button" onClick={onSimulate}><Plus size={16} /> Simulate an order</button>} />
    <section className="ledger-kpis orders-kpis">
      <div className="ledger-kpi"><span>Qualifying order volume</span><strong>{money(volume)}</strong><small>Across {orders.length} simulated orders</small></div>
      <div className="ledger-kpi"><span>Unilevel commissions</span><strong>{money(allocated)}</strong><small>{money(allocated + pool)} total income allocated</small></div>
      <div className="ledger-kpi"><span>20% turnover pool</span><strong>{money(pool)}</strong><small>Shared equally among eligible uplines</small></div>
      <div className="ledger-kpi"><span>Average order value</span><strong>{money(orders.length ? volume / orders.length : 0)}</strong><small>Qualifying volume per order</small></div>
    </section>
    <div className="panel ledger-panel">
      <div className="table-toolbar"><div><div className="panel-title">Simulated orders <span className="table-count">{filtered.length}</span></div><div className="panel-caption">Enrollments automatically record a $100 demo joining order</div></div><div className="table-controls"><label className="table-search"><Search size={15} /><input aria-label="Search orders" placeholder="Search reference or member" value={search} onChange={(event) => setSearch(event.target.value)} /></label></div></div>
      {filtered.length ? <div className="data-table-wrap"><table className="data-table order-table"><thead><tr><th>ORDER REFERENCE</th><th>ORDER MEMBER</th><th>TYPE</th><th>VOLUME</th><th>UNILEVEL</th><th>20% POOL</th><th>TOTAL ALLOCATED</th><th>STATUS</th><th>CREATED</th></tr></thead><tbody>{filtered.map((order) => <tr key={order.referenceId}><td className="id-cell">{order.referenceId}</td><td><div className="member-cell"><Avatar name={memberById.get(order.sourceMemberId)?.name ?? order.sourceMemberId} /><div><strong>{memberById.get(order.sourceMemberId)?.name ?? order.sourceMemberId}</strong><small>{order.sourceMemberId}</small></div></div></td><td>{order.orderType === 'joining' ? 'Joining' : 'Turnover'}</td><td>{money(order.qualifyingAmount)}</td><td>{money(order.commissionTotal)}</td><td>{money(order.turnoverPoolTotal)}</td><td className="ledger-amount">{money(order.totalAllocated)}</td><td><span className="order-status"><i />Processed</span></td><td>{shortDate(order.createdAt)}</td></tr>)}</tbody></table></div> : <EmptyState icon={ShoppingCart} title="No demo orders yet" message="Use the simulator to create a qualifying order. It will appear here with its volume and commission totals." action={<button className="text-action" onClick={onSimulate}>Create a demo order <ArrowRight size={14} /></button>} />}
      <div className="table-footer"><span>Showing <strong>{filtered.length}</strong> of <strong>{orders.length}</strong> orders</span><span>Mock records reset when the server restarts</span></div>
    </div>
    <div className="compliance-note"><ShieldCheck size={16} /><span>Orders here are simulations only. They do not represent real purchases, inventory, invoices, or customer payments.</span></div>
  </>;
}

function PayoutsPage({ payouts, members, onUpdated }: { payouts: PayoutEntry[]; members: Member[]; onUpdated: () => Promise<void> }) {
  const [filter, setFilter] = useState<'all' | PayoutEntry['status']>('all');
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const memberById = useMemo(() => new Map(members.map((member) => [member.id, member])), [members]);
  const entries = [...payouts].reverse().filter((payout) => filter === 'all' || payout.status === filter);
  const pendingTotal = payouts.filter((payout) => payout.status === 'pending').reduce((sum, payout) => sum + payout.amount, 0);
  const heldTotal = payouts.filter((payout) => payout.status === 'on-hold').reduce((sum, payout) => sum + payout.amount, 0);
  const paidTotal = payouts.filter((payout) => payout.status === 'paid').reduce((sum, payout) => sum + payout.amount, 0);

  async function setStatus(payout: PayoutEntry, status: PayoutEntry['status']): Promise<void> {
    setBusyId(payout.id);
    setError('');
    try {
      await api<PayoutEntry>(`/payouts/${payout.id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
      await onUpdated();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update this demo payout.');
    } finally {
      setBusyId('');
    }
  }

  return <>
    <PageHeading eyebrow="COMMISSION SETTLEMENT" title="Payout management" description="Review team-pool shares and unilevel income. Simulated member withdrawals require a $10 pending balance." action={<span className="configuration-badge"><ShieldCheck size={15} /> No real funds move</span>} />
    <section className="payout-summary">
      <div className="payout-summary-card"><span className="payout-summary-icon pending-tone"><Wallet size={17} /></span><div><span>Pending review</span><strong>{money(pendingTotal)}</strong><small>{payouts.filter((payout) => payout.status === 'pending').length} allocations</small></div></div>
      <div className="payout-summary-card"><span className="payout-summary-icon held-tone"><CircleHelp size={17} /></span><div><span>On hold</span><strong>{money(heldTotal)}</strong><small>{payouts.filter((payout) => payout.status === 'on-hold').length} allocations</small></div></div>
      <div className="payout-summary-card"><span className="payout-summary-icon paid-tone"><Check size={17} /></span><div><span>Marked complete</span><strong>{money(paidTotal)}</strong><small>{payouts.filter((payout) => payout.status === 'paid').length} demo allocations</small></div></div>
    </section>
    <div className="panel ledger-panel">
      {error && <div className="inline-error"><ShieldCheck size={17} /><span>{error}</span><button onClick={() => setError('')}>Dismiss</button></div>}
      <div className="table-toolbar"><div><div className="panel-title">Income payout queue <span className="table-count">{entries.length}</span></div><div className="panel-caption">Each row is an allocation; withdrawal actions pay a member's full available balance</div></div><div className="table-controls"><label className="filter-select"><Filter size={15} /><select aria-label="Filter payout status" value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)}><option value="all">All statuses</option><option value="pending">Pending</option><option value="on-hold">On hold</option><option value="paid">Completed</option></select></label></div></div>
      {entries.length ? <div className="data-table-wrap"><table className="data-table payout-table"><thead><tr><th>MEMBER</th><th>ORDER REFERENCE</th><th>INCOME STREAM</th><th>LEVEL</th><th>AMOUNT</th><th>STATUS</th><th>CREATED</th><th>ACTION</th></tr></thead><tbody>{entries.map((payout, index) => { const member = memberById.get(payout.memberId); const memberBalance = payouts.filter((candidate) => candidate.memberId === payout.memberId && candidate.status === 'pending').reduce((sum, candidate) => sum + candidate.amount, 0); return <tr key={payout.id}><td><div className="member-cell"><Avatar name={member?.name ?? payout.memberId} index={index} /><div><strong>{member?.name ?? payout.memberId}</strong><small>{payout.memberId}</small></div></div></td><td className="id-cell">{payout.referenceId}</td><td>{payout.incomeType === 'turnover-pool' ? '20% team pool' : payout.incomeType === 'rank-reward' ? 'Rank reward' : 'Unilevel'}</td><td><span className="level-pill">{payout.incomeType === 'rank-reward' ? 'Reward' : `Level ${payout.level}`}</span></td><td className="ledger-amount">{money(payout.amount)}</td><td><span className={`payout-status ${payout.status}`}><i />{payout.status === 'paid' ? 'Completed' : payout.status === 'on-hold' ? 'On hold' : 'Pending'}</span></td><td>{shortDate(payout.paidAt ?? payout.createdAt)}</td><td><div className="payout-actions">{payout.status === 'paid' ? <span className="paid-lock"><Check size={13} /> Closed</span> : <>{payout.status === 'pending' ? <button className="payout-action subtle-action" disabled={busyId === payout.id} onClick={() => void setStatus(payout, 'on-hold')}>Hold</button> : <button className="payout-action subtle-action" disabled={busyId === payout.id} onClick={() => void setStatus(payout, 'pending')}>Release</button>}{payout.status === 'pending' && <button className="payout-action pay-action" disabled={busyId === payout.id || memberBalance < 10} title={memberBalance < 10 ? `Member balance ${money(memberBalance)} is below the $10 minimum` : `Withdraw full available balance ${money(memberBalance)}`} onClick={() => void setStatus(payout, 'paid')}>{busyId === payout.id ? <span className="spinner small-spinner" /> : 'Withdraw balance'}</button>}</>}</div></td></tr>; })}</tbody></table></div> : <EmptyState icon={CreditCard} title="No payouts to review" message={filter === 'all' ? 'Simulated commission allocations appear here as pending demo payouts.' : `No ${filter} payout entries are in this demo queue.`} action={filter !== 'all' ? <button className="text-action" onClick={() => setFilter('all')}>Show all statuses</button> : undefined} />}
      <div className="table-footer"><span>Showing <strong>{entries.length}</strong> of <strong>{payouts.length}</strong> allocations</span><span>Minimum withdrawal is $10 per member; status changes move no real funds</span></div>
    </div>
  </>;
}

function RanksPage({ rules, progress, awards, onSaved, onAwardUpdated }: { rules: RankRule[]; progress: RankProgress[]; awards: RewardAward[]; onSaved: (rules: RankRule[]) => Promise<void>; onAwardUpdated: () => Promise<void> }) {
  const [draft, setDraft] = useState<RankRule[]>(rules);
  const [saving, setSaving] = useState(false);
  const [busyAwardId, setBusyAwardId] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [rankFilter, setRankFilter] = useState('all');
  useEffect(() => setDraft(rules), [rules]);
  const rankDistribution = rules.map((rule) => ({ ...rule, count: progress.filter((member) => member.currentRank.id === rule.id).length }));
  const earnedRewardValue = awards.reduce((sum, award) => sum + award.rewardAmount, 0);
  const filteredProgress = progress.filter((member) => rankFilter === 'all' || member.currentRank.id === rankFilter);
  const pendingAwards = awards.filter((award) => award.status === 'pending');

  function editRule(index: number, updates: Partial<RankRule>): void {
    setDraft((current) => current.map((rule, currentIndex) => currentIndex === index ? { ...rule, ...updates } : rule));
  }

  async function saveRules(): Promise<void> {
    setSaving(true);
    setError('');
    try {
      const updated = await api<RankRule[]>('/ranks/rules', {
        method: 'PUT',
        body: JSON.stringify({ rules: draft.map(({ name, rewardTitle, rewardAmount }) => ({ name, rewardTitle, rewardAmount })) }),
      });
      await onSaved(updated);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2200);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save rank and reward rules.');
    } finally {
      setSaving(false);
    }
  }

  async function updateAward(award: RewardAward, status: RewardAward['status']): Promise<void> {
    setBusyAwardId(award.id);
    setError('');
    try {
      await api<RewardAward>(`/ranks/rewards/${encodeURIComponent(award.id)}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      await onAwardUpdated();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update reward status.');
    } finally {
      setBusyAwardId('');
    }
  }

  return <>
    <PageHeading eyebrow="RECOGNITION PROGRAM" title="Ranks & rewards" description="Track referral qualification, manage tier rewards, and review each member’s progress." action={<span className="configuration-badge"><Award size={15} /> {rules.length} rank tiers</span>} />
    <div className="rank-summary-grid">{rankDistribution.map((rank, index) => <div className="rank-summary-card" key={rank.id}><div className="rank-summary-top"><span className={`rank-medal medal-${index % 4}`}><Award size={16} /></span><span className="rank-member-count">{rank.count} members</span></div><strong>{rank.name}</strong><span>{rank.rewardTitle} · {money(rank.rewardAmount)}</span></div>)}</div>
    <section className="panel rank-rules-panel">
      <div className="panel-header"><div><div className="panel-title">Qualification rules & reward schedule</div><div className="panel-caption">Star requires three active direct referrals. Each higher tier requires three active directs at the preceding rank.</div></div><span className="rules-version"><span /> PROGRAM RULES</span></div>
      <div className="rank-rules-table-wrap"><table className="rank-rules-table"><thead><tr><th>RANK TIER</th><th>DIRECT QUALIFICATION</th><th>REWARD NAME</th><th>REWARD VALUE</th></tr></thead><tbody>{draft.map((rule, index) => <tr key={rule.id}><td><div className="rank-edit-name"><span className={`rank-medal medal-${index % 4}`}><Award size={16} /></span><strong>{rule.name}</strong></div></td><td>{rule.requiredDirectRank ? `3 active direct ${rule.requiredDirectRank} members` : '3 active direct referrals'}</td><td><input className="rank-reward-title" aria-label={`${rule.name} reward title`} value={rule.rewardTitle} maxLength={64} onChange={(event) => editRule(index, { rewardTitle: event.target.value })} /></td><td><div className="rank-number-input"><span>$</span><input aria-label={`${rule.name} reward value`} type="number" min="10" step="0.01" value={rule.rewardAmount} onChange={(event) => editRule(index, { rewardAmount: Number(event.target.value) })} /></div></td></tr>)}</tbody></table></div>
      <div className="rank-rules-footer"><span>Reward amounts are editable. Six–Ten Star values continue the ×3 progression inferred from the source plan.</span><button className="primary-button" onClick={() => void saveRules()} disabled={saving || draft.length !== 10}>{saving ? <span className="spinner" /> : <Check size={16} />}{saved ? 'Saved' : 'Save rank rewards'}</button></div>
      {error && <div className="inline-error"><ShieldCheck size={17} /><span>{error}</span><button onClick={() => setError('')}>Dismiss</button></div>}
    </section>
    <section className="panel rank-progress-panel">
      <div className="table-toolbar"><div><div className="panel-title">Member rank progress <span className="table-count">{filteredProgress.length}</span></div><div className="panel-caption">Only active direct referrals count toward rank qualification</div></div><div className="table-controls"><label className="filter-select"><Filter size={15} /><select aria-label="Filter rank" value={rankFilter} onChange={(event) => setRankFilter(event.target.value)}><option value="all">All ranks</option>{rules.map((rule) => <option key={rule.id} value={rule.id}>{rule.name}</option>)}</select></label></div></div>
      <div className="data-table-wrap"><table className="data-table rank-progress-table"><thead><tr><th>MEMBER</th><th>CURRENT RANK</th><th>DIRECT REFERRALS</th><th>QUALIFIED DIRECTS FOR NEXT RANK</th><th>NEXT MILESTONE</th><th>REWARD AT RANK</th></tr></thead><tbody>{filteredProgress.map((member, index) => <tr key={member.memberId}><td><div className="member-cell"><Avatar name={member.name} index={index} status={member.status} /><div><strong>{member.name}</strong><small>{member.memberId}</small></div></div></td><td><span className="member-rank-chip"><Award size={13} />{member.currentRank.name}</span></td><td>{member.directReferrals}</td><td>{member.nextRank ? `${member.qualifyingDirectReferrals} / ${member.nextRank.requiredDirectReferrals}` : '—'}</td><td>{member.nextRank ? <div className="rank-next-cell"><div><span>{member.progressPercent}%</span><strong>{member.nextRank.name}</strong></div><div className="rank-progress-track"><span style={{ width: `${member.progressPercent}%` }} /></div></div> : <span className="rank-complete">Top tier reached</span>}</td><td><div className="reward-value-cell"><strong>{money(member.currentRank.rewardAmount)}</strong><small>{member.currentRank.rewardTitle}</small></div></td></tr>)}</tbody></table></div>
      <div className="table-footer"><span>Earned milestone reward value: <strong>{money(earnedRewardValue)}</strong></span><span>Three active direct referrals qualify each tier</span></div>
    </section>
    <section className="panel reward-awards-panel">
      <div className="table-toolbar"><div><div className="panel-title">Reward fulfillment queue <span className="table-count">{awards.length}</span></div><div className="panel-caption">Review rank milestone rewards and track their demo fulfillment status</div></div><span className="pending-awards-badge">{pendingAwards.length} to review</span></div>
      {awards.length ? <div className="data-table-wrap"><table className="data-table reward-awards-table"><thead><tr><th>MEMBER</th><th>ACHIEVED RANK</th><th>REWARD</th><th>VALUE</th><th>STATUS</th><th>ACTION</th></tr></thead><tbody>{awards.map((award, index) => <tr key={award.id}><td><div className="member-cell"><Avatar name={award.memberName} index={index} /><div><strong>{award.memberName}</strong><small>{award.memberId}</small></div></div></td><td><span className="member-rank-chip"><Award size={13} />{award.rankName}</span></td><td>{award.rewardTitle}</td><td className="ledger-amount">{money(award.rewardAmount)}</td><td><span className={`award-status ${award.status}`}><i />{award.status}</span></td><td>{award.status === 'fulfilled' ? <span className="paid-lock"><Check size={13} /> Fulfilled</span> : <button className={`payout-action ${award.status === 'pending' ? 'subtle-action' : 'pay-action'}`} disabled={busyAwardId === award.id} onClick={() => void updateAward(award, award.status === 'pending' ? 'approved' : 'fulfilled')}>{busyAwardId === award.id ? <span className="spinner small-spinner" /> : award.status === 'pending' ? 'Approve reward' : 'Mark fulfilled'}</button>}</td></tr>)}</tbody></table></div> : <EmptyState icon={Gift} title="No rewards awaiting fulfillment" message="Members who qualify for a reward tier will be listed here for review." />}
      <div className="table-footer"><span>Rewards are based on the member’s current rank</span><span>Approval and fulfillment only update demo status</span></div>
    </section>
    {error && <div className="inline-error"><ShieldCheck size={17} /><span>{error}</span><button onClick={() => setError('')}>Dismiss</button></div>}
  </>;
}

function ReportsPage({ members, orders, payouts, progress, ledger }: { members: Member[]; orders: SimulatedOrder[]; payouts: PayoutEntry[]; progress: RankProgress[]; ledger: CommissionEntry[] }) {
  const [period, setPeriod] = useState<'all' | '30' | '7'>('all');
  const cutoff = period === 'all' ? 0 : Date.now() - Number(period) * 24 * 60 * 60 * 1000;
  const periodOrders = orders.filter((order) => new Date(order.createdAt).getTime() >= cutoff);
  const periodPayouts = payouts.filter((payout) => new Date(payout.createdAt).getTime() >= cutoff);
  const totalVolume = periodOrders.reduce((sum, order) => sum + order.qualifyingAmount, 0);
  const totalCommission = periodOrders.reduce((sum, order) => sum + order.commissionTotal, 0);
  const turnoverPoolTotal = periodOrders.reduce((sum, order) => sum + order.turnoverPoolTotal, 0);
  const periodRankRewards = ledger.filter((entry) => entry.incomeType === 'rank-reward' && new Date(entry.createdAt).getTime() >= cutoff);
  const rankRewardTotal = periodRankRewards.reduce((sum, entry) => sum + entry.commissionAmount, 0);
  const totalIncome = totalCommission + turnoverPoolTotal + rankRewardTotal;
  const paidAmount = periodPayouts.filter((payout) => payout.status === 'paid').reduce((sum, payout) => sum + payout.amount, 0);
  const rankTotals = [...progress.reduce((map, member) => map.set(member.currentRank.name, (map.get(member.currentRank.name) ?? 0) + 1), new Map<string, number>())].map(([name, count]) => ({ name, count }));
  const maxRankCount = Math.max(1, ...rankTotals.map((rank) => rank.count));

  function exportReport(): void {
    const rows = [
      ['Metric', 'Value'],
      ['Members', String(members.length)],
      ['Active members', String(members.filter((member) => member.status === 'active').length)],
      ['Qualifying order volume', totalVolume.toFixed(2)],
      ['Unilevel commission income', totalCommission.toFixed(2)],
      ['20% turnover pool income', turnoverPoolTotal.toFixed(2)],
      ['Rank reward income', rankRewardTotal.toFixed(2)],
      ['Total income allocated', totalIncome.toFixed(2)],
      ['Demo payouts marked paid', paidAmount.toFixed(2)],
      ...rankTotals.map((rank) => [`${rank.name} members`, String(rank.count)]),
    ];
    downloadCsv('orbit-network-report.csv', rows);
  }

  return <>
    <PageHeading eyebrow="NETWORK PERFORMANCE" title="Reports" description="A consolidated view of joining turnover, the 20% team pool, unilevel commissions, ranks, and simulated withdrawals." action={<button className="secondary-button" onClick={exportReport}><Download size={15} /> Export report</button>} />
    <div className="report-controls"><span><Activity size={15} /> Activity summary</span><label><span>Reporting period</span><select value={period} onChange={(event) => setPeriod(event.target.value as typeof period)}><option value="all">All demo activity</option><option value="30">Last 30 days</option><option value="7">Last 7 days</option></select></label></div>
    <section className="report-kpi-grid"><div className="report-kpi"><span>Total members</span><strong>{members.length}</strong><small>{members.filter((member) => member.status === 'active').length} active · {members.filter((member) => member.status === 'inactive').length} inactive</small></div><div className="report-kpi"><span>Qualifying turnover</span><strong>{money(totalVolume)}</strong><small>{periodOrders.filter((order) => order.orderType === 'joining').length} joining orders · {periodOrders.length} total orders</small></div><div className="report-kpi"><span>Unilevel commissions</span><strong>{money(totalCommission)}</strong><small>Up to 10 eligible levels</small></div><div className="report-kpi"><span>20% team pool</span><strong>{money(turnoverPoolTotal)}</strong><small>Equal shares to active uplines</small></div><div className="report-kpi"><span>Total income allocated</span><strong>{money(totalIncome)}</strong><small>{money(rankRewardTotal)} rank rewards · {money(paidAmount)} paid</small></div></section>
    <section className="reports-grid">
      <div className="panel report-panel"><div className="panel-header"><div><div className="panel-title">Member rank distribution</div><div className="panel-caption">Current mock qualification across the network</div></div><Award size={17} className="report-heading-icon" /></div>{rankTotals.length ? <div className="rank-distribution">{rankTotals.map((rank, index) => <div className="distribution-row" key={rank.name}><div className="distribution-label"><span className={`rank-medal medal-${index % 4}`}><Award size={13} /></span><strong>{rank.name}</strong><span>{rank.count} members</span></div><div className="distribution-track"><span className={`distribution-fill medal-fill-${index % 4}`} style={{ width: `${(rank.count / maxRankCount) * 100}%` }} /></div></div>)}</div> : <EmptyState icon={Award} title="No rank data" message="Rank progress appears when the program has member tiers." />}</div>
      <div className="panel report-panel"><div className="panel-header"><div><div className="panel-title">Payout queue health</div><div className="panel-caption">Status across demo commission allocations</div></div><CreditCard size={17} className="report-heading-icon" /></div><div className="payout-health-total"><strong>{payouts.length}</strong><span>total allocations</span></div><div className="payout-health-rows"><div><span><i className="health-square pending-square" />Pending</span><strong>{payouts.filter((payout) => payout.status === 'pending').length}</strong></div><div><span><i className="health-square held-square" />On hold</span><strong>{payouts.filter((payout) => payout.status === 'on-hold').length}</strong></div><div><span><i className="health-square paid-square" />Marked paid</span><strong>{payouts.filter((payout) => payout.status === 'paid').length}</strong></div></div><div className="report-caption-note">{ledger.length} commission ledger entries · {orders.length} qualifying orders</div></div>
    </section>
    <div className="compliance-note"><CircleHelp size={16} /><span>Rank qualification follows the three-direct referral ladder. Reports summarize only the current in-memory demo session; marking paid is not a transfer.</span></div>
  </>;
}

function SettingsPage({ settings, onSaved, onPasswordChanged, onSignOut }: { settings: AdminSettings; onSaved: (settings: AdminSettings) => void; onPasswordChanged: () => void; onSignOut: () => void }) {
  const [workspaceName, setWorkspaceName] = useState(settings.workspaceName);
  const [adminName, setAdminName] = useState(settings.adminName);
  const [adminEmail, setAdminEmail] = useState(settings.adminEmail);
  const [emailPassword, setEmailPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [showEmailPassword, setShowEmailPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  useEffect(() => {
    setWorkspaceName(settings.workspaceName);
    setAdminName(settings.adminName);
    setAdminEmail(settings.adminEmail);
  }, [settings]);

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const updated = await api<AdminSettings>('/settings', {
        method: 'PUT',
        body: JSON.stringify({ workspaceName, adminName }),
      });
      onSaved(updated);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save program settings.');
    } finally {
      setSaving(false);
    }
  }

  async function updateEmail(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setSavingEmail(true);
    setEmailError('');
    try {
      const updated = await api<AdminSettings>('/settings/account-email', {
        method: 'PATCH',
        body: JSON.stringify({ email: adminEmail, currentPassword: emailPassword }),
      });
      setEmailPassword('');
      onSaved(updated);
    } catch (cause) {
      setEmailError(cause instanceof Error ? cause.message : 'Could not update the admin email.');
    } finally {
      setSavingEmail(false);
    }
  }

  async function updatePassword(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setPasswordError('');
    if (newPassword !== confirmPassword) {
      setPasswordError('The new password and confirmation do not match.');
      return;
    }
    setSavingPassword(true);
    try {
      await api<{ updated: boolean }>('/settings/password', {
        method: 'PATCH',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onPasswordChanged();
    } catch (cause) {
      setPasswordError(cause instanceof Error ? cause.message : 'Could not update the admin password.');
    } finally {
      setSavingPassword(false);
    }
  }

  return <>
    <PageHeading eyebrow="WORKSPACE ADMINISTRATION" title="Workspace & admin settings" description="Manage workspace details, administrator access, and demo safeguards." />
    <div className="settings-layout">
      <section className="panel settings-panel">
        <div className="panel-header"><div><div className="panel-title">Workspace profile</div><div className="panel-caption">This identity is used across your admin workspace</div></div><span className="settings-icon"><Settings2 size={17} /></span></div>
        <form className="settings-form" onSubmit={(event) => void submit(event)}><label className="field-label" htmlFor="workspace-name">Workspace name</label><input id="workspace-name" className="form-control" value={workspaceName} onChange={(event) => setWorkspaceName(event.target.value)} minLength={2} maxLength={48} required /><label className="field-label" htmlFor="admin-name">Administrator display name</label><input id="admin-name" className="form-control" value={adminName} onChange={(event) => setAdminName(event.target.value)} minLength={2} maxLength={48} required /><div className="settings-readonly"><span>Default currency</span><strong>USD · US Dollar</strong><small>Currency is fixed for consistent demo calculations.</small></div>{error && <div className="form-error">{error}</div>}<div className="settings-actions"><span>Changes are stored in memory until restart.</span><button className="primary-button" type="submit" disabled={saving}>{saving ? <span className="spinner" /> : <Check size={16} />}{saving ? 'Saving...' : 'Save workspace profile'}</button></div></form>
      </section>
      <aside className="settings-side">
        <section className="panel settings-account-card">
          <div className="panel-header"><div><div className="panel-title">Administrator profile</div><div className="panel-caption">Update the email used to sign in</div></div><Avatar name={adminName} large /></div>
          <div className="settings-account-summary"><strong>{adminName}</strong><span>{settings.adminEmail}</span></div>
          <form className="settings-form account-edit-form" onSubmit={(event) => void updateEmail(event)}>
            <label className="field-label" htmlFor="admin-email">Login email</label>
            <input id="admin-email" className="form-control" type="email" value={adminEmail} onChange={(event) => setAdminEmail(event.target.value)} maxLength={254} required />
            <label className="field-label" htmlFor="email-current-password">Confirm with current password</label>
            <div className="input-wrap password-wrap settings-password-wrap"><input id="email-current-password" type={showEmailPassword ? 'text' : 'password'} autoComplete="current-password" value={emailPassword} onChange={(event) => setEmailPassword(event.target.value)} required /><button type="button" aria-label={showEmailPassword ? 'Hide password' : 'Show password'} onClick={() => setShowEmailPassword(!showEmailPassword)}>{showEmailPassword ? <EyeOff size={15} /> : <Eye size={15} />}</button></div>
            {emailError && <div className="form-error">{emailError}</div>}
            <button className="secondary-button" type="submit" disabled={savingEmail}>{savingEmail ? <span className="spinner dark-spinner" /> : <Check size={15} />}{savingEmail ? 'Updating...' : 'Update login email'}</button>
          </form>
          <div className="settings-divider" />
          <div className="settings-security-heading"><strong>Password & security</strong><span>Changing your password applies immediately.</span></div>
          <form className="settings-form account-edit-form" onSubmit={(event) => void updatePassword(event)}>
            <label className="field-label" htmlFor="current-admin-password">Current password</label>
            <div className="input-wrap password-wrap settings-password-wrap"><input id="current-admin-password" type={showCurrentPassword ? 'text' : 'password'} autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required /><button type="button" aria-label={showCurrentPassword ? 'Hide password' : 'Show password'} onClick={() => setShowCurrentPassword(!showCurrentPassword)}>{showCurrentPassword ? <EyeOff size={15} /> : <Eye size={15} />}</button></div>
            <label className="field-label" htmlFor="new-admin-password">New password</label>
            <div className="input-wrap password-wrap settings-password-wrap"><input id="new-admin-password" type={showNewPassword ? 'text' : 'password'} autoComplete="new-password" minLength={8} maxLength={72} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required /><button type="button" aria-label={showNewPassword ? 'Hide password' : 'Show password'} onClick={() => setShowNewPassword(!showNewPassword)}>{showNewPassword ? <EyeOff size={15} /> : <Eye size={15} />}</button></div>
            <label className="field-label" htmlFor="confirm-admin-password">Confirm new password</label>
            <div className="input-wrap password-wrap settings-password-wrap"><input id="confirm-admin-password" type={showConfirmPassword ? 'text' : 'password'} autoComplete="new-password" minLength={8} maxLength={72} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required /><button type="button" aria-label={showConfirmPassword ? 'Hide password' : 'Show password'} onClick={() => setShowConfirmPassword(!showConfirmPassword)}>{showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}</button></div>
            <span className="settings-password-hint">Use at least 8 characters. You will keep your current session.</span>
            {passwordError && <div className="form-error">{passwordError}</div>}
            <button className="primary-button" type="submit" disabled={savingPassword}>{savingPassword ? <span className="spinner" /> : <ShieldCheck size={15} />}{savingPassword ? 'Updating password...' : 'Change password'}</button>
          </form>
          <button className="secondary-button settings-signout" onClick={onSignOut}><LogOut size={15} /> Sign out of demo</button>
        </section>
        <div className="panel settings-info-card"><div className="settings-info-icon"><ShieldCheck size={18} /></div><strong>Demo safeguards</strong><p>This app uses temporary in-memory sessions, mock members, simulated order volume, and non-transferable payout statuses.</p><div className="settings-info-list"><span><Check size={14} />No real payment processing</span><span><Check size={14} />Data resets on server restart</span><span><Check size={14} />Account changes reset on server restart</span></div></div>
      </aside>
    </div>
    <div className="compliance-note"><CircleHelp size={16} /><span>Before real launch, replace the mock auth, add persistent storage and role-based access, and review legal/compliance needs for your compensation plan.</span></div>
  </>;
}

function downloadCsv(filename: string, rows: string[][]): void {
  const csv = rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function MemberModal({ members, member, mode, onClose, onSaved }: { members: Member[]; member?: Member; mode: 'create' | 'edit'; onClose: () => void; onSaved: (member: Member) => void }) {
  const [name, setName] = useState(member?.name ?? '');
  const [email, setEmail] = useState(member?.email ?? '');
  const [sponsorId, setSponsorId] = useState(member?.sponsorId ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const editing = mode === 'edit' && member;
  const excludedSponsorIds = new Set<string>();
  if (member) {
    const pending = [member.id];
    while (pending.length) {
      const parentId = pending.pop();
      if (!parentId) continue;
      excludedSponsorIds.add(parentId);
      pending.push(...members.filter((candidate) => candidate.sponsorId === parentId).map((candidate) => candidate.id));
    }
  }
  const sponsors = members.filter((candidate) => !candidate.archivedAt && !excludedSponsorIds.has(candidate.id));

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const saved = editing
        ? await api<Member>(`/members/${member.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ name, email, sponsorId: sponsorId || undefined }),
        })
        : await api<Member>('/members', {
          method: 'POST',
          body: JSON.stringify({ name, email, sponsorId: sponsorId || undefined }),
        });
      onSaved(saved);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not add this member.');
    } finally {
      setSaving(false);
    }
  }

  return <div className="modal-scrim" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="member-modal-title"><div className="modal-header"><div><div className="eyebrow">NETWORK MANAGEMENT</div><h2 id="member-modal-title">{editing ? 'Edit member' : 'Add a member'}</h2><p>{editing ? 'Update this member’s profile and referral placement.' : 'Create a member and connect them to your referral tree.'}</p></div><button className="icon-button" aria-label="Close dialog" onClick={onClose}><X size={19} /></button></div><form className="modal-form" onSubmit={(event) => void submit(event)}><label className="field-label" htmlFor="member-name">Full name</label><input className="form-control" id="member-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Jordan Taylor" minLength={2} maxLength={64} required /><label className="field-label" htmlFor="member-email">Email address</label><input className="form-control" id="member-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="jordan@example.test" maxLength={254} required /><label className="field-label" htmlFor="member-sponsor">Sponsor / referrer <span className="optional-label">OPTIONAL</span></label><select className="form-control" id="member-sponsor" value={sponsorId} onChange={(event) => setSponsorId(event.target.value)}><option value="">Direct member / network root</option>{sponsors.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name} · {candidate.id}{candidate.status === 'inactive' ? ' (inactive)' : ''}</option>)}</select>{editing ? <div className="modal-note"><ShieldCheck size={15} /> Existing orders and payouts are not recalculated. A sponsor change updates the current tree and future allocations.</div> : <div className="modal-note"><ShieldCheck size={15} /> Enrollment records a $100 joining order for demo turnover; no payment is collected.</div>}{error && <div className="form-error">{error}</div>}<div className="modal-actions"><button className="secondary-button" type="button" onClick={onClose}>Cancel</button><button className="primary-button" type="submit" disabled={saving}>{saving ? <span className="spinner" /> : editing ? <Check size={16} /> : <Plus size={16} />}{saving ? 'Saving...' : editing ? 'Save member' : 'Add to network'}</button></div></form></section></div>;
}

function Avatar({ name, large = false, index = 0, status }: { name: string; large?: boolean; index?: number; status?: 'active' | 'inactive' }) {
  return <span className={`avatar avatar-${index % 6} ${large ? 'avatar-large' : ''} ${status === 'inactive' ? 'avatar-inactive' : ''}`}>{initials(name)}</span>;
}

function EmptyState({ icon: Icon, title, message, action }: { icon: LucideIcon; title: string; message: string; action?: React.ReactNode }) {
  return <div className="empty-state"><div className="empty-icon"><Icon size={20} /></div><strong>{title}</strong><span>{message}</span>{action}</div>;
}

function LoadingState() {
  return <div className="loading-state"><span className="spinner dark-spinner" /><span>Opening your workspace...</span></div>;
}

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  if (!message) return null;
  return <div className="toast-message"><Check size={16} /><span>{message}</span><button aria-label="Dismiss notification" onClick={onClose}><X size={15} /></button></div>;
}

export default App;
