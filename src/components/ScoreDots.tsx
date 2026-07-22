// 1~5점 점수를 점(dot) 5개로 시각화하는 컴포넌트
import { clampIndex, getDotColor } from "./lib";

export function ScoreDots({ score }: { score: number }) {
  // 채울 도트 개수는 0~5로 제한 (score=0이면 0개 채움 유지, 5 초과 시 5개로 캡)
  const filled = clampIndex(score, 0, 5);
  // 색상은 실제 채워진 등급 기준으로 조회 (filled=0이면 어차피 도트가 안 채워지므로 중립색이어도 무방)
  const color = getDotColor(filled);
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map((i) => (
        <span key={i} className="w-2 h-2 rounded-full border flex-shrink-0 transition-colors"
          style={{
            backgroundColor: i <= filled ? color : "transparent",
            borderColor:      i <= filled ? color : "#D1D5DB",
          }} />
      ))}
    </div>
  );
}
