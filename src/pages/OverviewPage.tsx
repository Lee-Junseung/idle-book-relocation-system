// 도서관 전체 현황(핵심 지표, 월별 대출 추이, 연령대 분포, 분관 네트워크)을 보여주는 대시보드 화면
import { useRef, useState, useEffect } from "react";
import {
  Bar, ComposedChart, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Line,
  PieChart, Pie, Cell,
} from "recharts";
import {
  BookOpen, AlertTriangle, ArrowLeftRight,
  Pin, ClipboardList, Library,
} from "lucide-react";

import { Card, MetricCard, withAlpha } from "../components";
import { NAV, BLUE, RED, PURPLE, AMBER, BROWN, PIE_COLORS } from "../constants/colors";
import {
  getIdleBooksCount,
  getDamagePendingCount,
  getTransferPendingCount,
  getMonthlyLoans,
  getUsersDistribution,
  getLibraryNetworkDistances,
} from "../api/dashboard";

// 화면에서 쓰는 로컬 도메인 타입
interface LoanTrendPoint { month: string; collection: number; loans: number; turnover: number }
interface DemographicPoint { age: string; count: number; pct: number }
interface Branch {
  id: string;
  name: string;
  district: string;
  collection: number;
  distance: number;
  hub: boolean;
}

const AGE_LABELS = {
  ageUnder10: "10대 이하",
  age10s: "10대",
  age20s: "20대",
  age30s: "30대",
  age40s: "40대",
  age50s: "50대",
  age60Plus: "60대 이상",
} as const;

const HUB_LIBRARY_NAME = "북수원도서관";

export function OverviewPage() {
  const [loanTrendData, setLoanTrendData] = useState<LoanTrendPoint[]>([]);
  const [demographicsData, setDemographicsData] = useState<DemographicPoint[]>([]);
  const [regMembers, setRegMembers] = useState(0);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [hubCollection, setHubCollection] = useState(0);
  const [hubBooksDelta, setHubBooksDelta] = useState(0);

  const [snapshotStats, setSnapshotStats] = useState({
    lowTurnoverBooks: { value: "0", trend: "0%" },
    pendingWearReview: { value: "0" },
    pendingRelocationReview: { value: "0" },
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      try {
        setLoading(true);
        const [
          idleBooks,
          damagePending,
          transferPending,
          monthlyLoans,
          usersDistribution,
          libraryNetwork,
        ] = await Promise.all([
          getIdleBooksCount(),
          getDamagePendingCount(),
          getTransferPendingCount(),
          getMonthlyLoans(),
          getUsersDistribution(),
          getLibraryNetworkDistances(),
        ]);

        if (cancelled) return;

        // 유휴화 도서
        const pct = idleBooks.data.percentageChange;
        setSnapshotStats({
          lowTurnoverBooks: {
            value: idleBooks.data.currentMonthCount.toLocaleString(),
            trend: `${pct >= 0 ? "+" : ""}${pct}%`,
          },
          // 파손 심사 대기
          pendingWearReview: { value: damagePending.data.currentMonthCount.toLocaleString() },
          // 이관 검토 대기
          pendingRelocationReview: { value: transferPending.data.count.toLocaleString() },
        });

        // 월별 대출 추이 + 소장 도서 수 (최신월 기준)
        const trend: LoanTrendPoint[] = monthlyLoans.data.map((d) => {
          const [, m] = d.date.split("-");
          return {
            month: `${parseInt(m, 10)}월`,
            collection: d.totalBooks,
            loans: d.totalLoans,
            turnover: d.turnoverRate,
          };
        });
        setLoanTrendData(trend);
        const latestMonth = monthlyLoans.data[monthlyLoans.data.length - 1];
        setHubCollection(latestMonth?.totalBooks ?? 0);
        setHubBooksDelta(latestMonth?.booksDelta ?? 0);

        // 연령대 분포
        const dist = usersDistribution.data.ageDistribution;
        type AgeKey = keyof typeof dist;
        const demo: DemographicPoint[] = (Object.keys(AGE_LABELS) as AgeKey[]).map((key) => ({
          age: AGE_LABELS[key],
          count: dist[key].count,
          pct: dist[key].percentage,
        }));
        setDemographicsData(demo);
        setRegMembers(usersDistribution.data.totalPopulation);

        // 분관 네트워크
        const branchList: Branch[] = libraryNetwork.data.map((b, i) => ({
          id: `${b.libraryName}-${i}`,
          name: b.libraryName,
          district: b.address,
          collection: b.bookCount,
          distance: b.length,
          hub: b.libraryName === HUB_LIBRARY_NAME,
        }));
        setBranches(branchList);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "데이터를 불러오지 못했습니다.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadDashboard();
    return () => { cancelled = true; };
  }, []);

  const chartWrapRef = useRef(null);
  const [chartWidth, setChartWidth] = useState(0);

  useEffect(() => {
    const el = chartWrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      setChartWidth(entries[0].contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [loading]);

  const demoCardRef = useRef(null);
  const [demoCardWidth, setDemoCardWidth] = useState(0);

  useEffect(() => {
    const el = demoCardRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      setDemoCardWidth(entries[0].contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [loading]);

  if (loading) {
    return <div className="p-4 sm:p-6 text-sm text-muted-foreground">데이터를 불러오는 중입니다...</div>;
  }

  if (error) {
    return <div className="p-4 sm:p-6 text-sm text-red-500">{error}</div>;
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-5">

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-3.5 sm:px-4 py-3 rounded-md border"
        style={{ backgroundColor: withAlpha(NAV, 0.03), borderColor: withAlpha(NAV, 0.19) }}>
        <div className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0" style={{ backgroundColor: NAV }}>
          <Pin className="w-4 h-4 text-white" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-foreground">북수원도서관</span>
            <span className="text-xs text-muted-foreground break-words">경기도 수원시 장안구 정조로 944</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            수원시 공공도서관 네트워크 연결 · 이관 알고리즘 기준점
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        <MetricCard
          label="소장 도서 수" value={hubCollection.toLocaleString()} sub="총 소장 권수"
          trend={`${hubBooksDelta >= 0 ? "+" : ""}${hubBooksDelta.toLocaleString()}권`}
          color={NAV} icon={BookOpen} />
        <MetricCard
          label="유휴화 도서" value={snapshotStats.lowTurnoverBooks.value} sub="전월 대비"
          trend={snapshotStats.lowTurnoverBooks.trend} color={AMBER} icon={AlertTriangle} invertTrend />
        <MetricCard
          label="파손 심사 대기" value={snapshotStats.pendingWearReview.value} sub="사서 심사 미완료"
          color={PURPLE} icon={ClipboardList} />
        <MetricCard
          label="이관 검토 대기" value={snapshotStats.pendingRelocationReview.value} sub="이관 미결정"
          color={BLUE} icon={ArrowLeftRight} />
      </div>

      <Card className="p-3.5 sm:p-4 flex flex-col">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-3">
          <div>
            <h3 className="text-foreground">북수원도서관 월별 대출 현황</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              소장 도서 수 · 대출 건수 · 평균 회전율
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] flex-shrink-0">
            {[
              { label: "소장 도서 수", c: withAlpha(NAV, 0.38) },
              { label: "대출 건수", c: BLUE },
              { label: "평균 회전율", c: RED },
            ].map(l => (
              <span key={l.label} className="flex items-center gap-1 text-muted-foreground whitespace-nowrap">
                <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: l.c }} />
                {l.label}
              </span>
            ))}
          </div>
        </div>
        <div className="h-56 sm:h-64 md:h-72" ref={chartWrapRef}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={loanTrendData}
              margin={{ top: 8, right: chartWidth < 480 ? 0 : 8, bottom: 4, left: chartWidth < 480 ? -16 : -8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
              <XAxis dataKey="month"
                interval={chartWidth < 480 ? 1 : 0}
                tick={{ fontSize: 10, fill: "#9CA3AF", fontFamily: "'JetBrains Mono', monospace" }}
                axisLine={false} tickLine={false} />
              <YAxis yAxisId="collection" axisLine={false} tickLine={false}
                width={chartWidth < 480 ? 34 : 40}
                domain={["dataMin - 2000", "dataMax + 2000"]}
                tick={{ fontSize: 10, fill: "#9CA3AF", fontFamily: "'JetBrains Mono', monospace" }}
                tickFormatter={v => v >= 1000 ? (v / 1000).toFixed(0) + "k" : String(v)} />
              <YAxis yAxisId="loans" orientation="right" axisLine={false} tickLine={false}
                width={chartWidth < 480 ? 34 : 40}
                tick={{ fontSize: 10, fill: "#9CA3AF", fontFamily: "'JetBrains Mono', monospace" }}
                tickFormatter={v => v >= 1000 ? (v / 1000).toFixed(0) + "k" : String(v)} />
              <YAxis yAxisId="turnover" hide domain={[0, "dataMax + 0.03"]} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const row = loanTrendData.find(d => d.month === label);
                  return (
                    <div className="bg-card border border-border rounded shadow-lg px-3 py-2.5 text-xs w-[170px] sm:min-w-[190px] sm:w-auto">
                      <p className="font-semibold text-foreground mb-2 pb-1.5 border-b border-border">{label}</p>
                      {[
                        { label: "소장 도서 수", value: row ? row.collection.toLocaleString() + "권" : "", color: NAV },
                        { label: "대출 건수", value: row ? row.loans.toLocaleString() + "건" : "", color: BLUE },
                        { label: "평균 회전율", value: row ? (row.turnover * 100).toFixed(1) + "%" : "", color: RED },
                      ].map(r => (
                        <div key={r.label} className="flex items-center justify-between gap-4 py-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: r.color }} />
                            <span className="text-muted-foreground">{r.label}</span>
                          </div>
                          <span className="font-semibold text-foreground" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                            {r.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                }}
              />
              <Bar yAxisId="collection" dataKey="collection" name="소장 도서 수"
                fill={NAV} fillOpacity={0.16} radius={[2, 2, 0, 0]} barSize={chartWidth < 480 ? 14 : 20} />
              <Line yAxisId="loans" type="monotone" dataKey="loans" name="대출 건수"
                stroke={BLUE} strokeWidth={2}
                dot={{ r: 3, fill: BLUE, strokeWidth: 1.5, stroke: "#fff" }}
                activeDot={{ r: 5, fill: BLUE, strokeWidth: 0 }} />
              <Line yAxisId="turnover" type="monotone" dataKey="turnover" name="평균 회전율"
                stroke={RED} strokeWidth={2}
                dot={{ r: 3, fill: RED, strokeWidth: 1.5, stroke: "#fff" }}
                activeDot={{ r: 5, fill: RED, strokeWidth: 0 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div ref={demoCardRef} className="h-full">
          <Card className="p-3.5 sm:p-4 flex flex-col h-full">
            <h3 className="text-foreground mb-1">지역 연령대 분포</h3>
            <p className="text-xs text-muted-foreground mb-3">장안구 거주자 기준</p>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={demographicsData}
                  cx="50%" cy="50%"
                  innerRadius={60} outerRadius={90}
                  paddingAngle={2}
                  dataKey="count" nameKey="age"
                  startAngle={90} endAngle={-270}
                >
                  {demographicsData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="none" />)}
                </Pie>
                <Tooltip
                  formatter={(v: number) => v != null ? `${v.toLocaleString()}명` : ""}
                  contentStyle={{ fontSize: 11, borderRadius: 4, border: "1px solid #E5E7EB" }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-1 mt-auto">
              {demographicsData.map((d, i) => (
                <div key={d.age} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-[11px] text-muted-foreground truncate">{d.age}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="w-10 sm:w-14 h-1 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${d.pct}%`, backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    </div>
                    <span className="text-[11px] font-medium text-foreground w-8 text-right"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}>{d.pct}%</span>
                    {demoCardWidth >= 300 && (
                      <span className="text-[10px] text-muted-foreground text-right w-16 flex-shrink-0"
                        style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        ({d.count.toLocaleString()}명)
                      </span>
                    )}
                  </div>
                </div>
              ))}
              <p className="text-[10px] text-muted-foreground mt-1 pt-1 border-t border-border">
                총원: <span className="font-semibold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{regMembers.toLocaleString()}명</span>
              </p>
            </div>
          </Card>
        </div>

        <Card className="p-3.5 sm:p-4 flex flex-col h-full">
          <h3 className="text-foreground mb-1">수원시 도서관 네트워크</h3>
          <p className="text-xs text-muted-foreground mb-3">이관 알고리즘 기준 분관 현황 (북수원도서관 기준)</p>
          <div className="flex flex-col gap-1.5">
            {branches.map((b) => (
              <div key={b.id} className="flex items-center gap-2 sm:gap-2.5 px-2.5 py-2 rounded border border-border">
                <div className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: withAlpha(b.hub ? NAV : BROWN, 0.08) }}>
                  {b.hub
                    ? <Pin className="w-3.5 h-3.5" style={{ color: NAV }} />
                    : <Library className="w-3.5 h-3.5" style={{ color: BROWN }} />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-foreground truncate">{b.name}</span>
                    {b.hub && (
                      <span className="text-[9px] font-bold px-1 py-0.5 rounded text-white flex-shrink-0" style={{ backgroundColor: NAV }}>HUB</span>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground block truncate" title={b.district}>
                    {b.district}
                  </span>
                </div>
                <div className="flex flex-col items-end flex-shrink-0">
                  <span className="text-[11px] font-medium text-foreground whitespace-nowrap" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    {b.collection.toLocaleString()}권
                  </span>
                  {!b.hub && (
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      {b.distance}km
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 pt-2 border-t border-border">
            총 {branches.length}개 분관
          </p>
        </Card>
      </div>
    </div>
  );
}