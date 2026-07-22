// 시드 기반 파생 데이터(마모 점검 추정치, 월별 대출량 추정치 등) 생성에 공통으로 쓰는 유틸.
// 기존에는 wearUtils.ts와 damageInspections.ts에 거의 동일한 해시 로직이 중복돼 있었음.
import { ScoreValue } from "../types";

// 문자열을 결정적(deterministic)으로 해시한다 — 같은 입력이면 항상 같은 값을 반환하므로
// 새로고침해도 목업 데이터가 흔들리지 않는다. 암호학적 용도가 아닌 시드 생성 전용.
export function hashCode(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// 값을 반올림한 뒤 1~5 범위로 클램핑해 ScoreValue로 반환한다.
export function clampToScore(n: number): ScoreValue {
  return Math.max(1, Math.min(5, Math.round(n))) as ScoreValue;
}
