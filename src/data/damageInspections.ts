// ⚠️ 이 파일은 이번 업로드된 src.zip에 포함되어 있지 않아서 임시로 빈 시드로 채워 넣었습니다.
// App.tsx / WearManagePage.tsx가 참조하는 DAMAGE_INSPECTIONS(도서별 초기 점검 데이터)가
// 원래 이 경로에 있었을 것으로 보이는데, 실제 저장소에 파일이 남아있다면 이 스텁을 지우고
// 원본 파일로 교체해 주세요. 지금 상태로는 WearManagePage에 "아직 아무 도서도 점검되지
// 않은 것"처럼 보일 수 있습니다.
//
// (참고: 점검 항목 정의(INSP_ITEMS_FLAT)와 평균 점수 계산(averageScore)은
// constants/checklistItems.ts로 옮겨져 있어서 그쪽에서 import하면 됩니다.)
import { DamageInspection } from "../types";

export const DAMAGE_INSPECTIONS: Record<string, DamageInspection> = {};
