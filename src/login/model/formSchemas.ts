import { z } from 'zod';

/**
 * 기존 사용자 폼 스키마
 * KPT(Keep, Problem, Try) 회고 및 NPS 점수, 계속 참여 여부를 수집합니다.
 */
export const activeUserFormSchema = z.object({
  keep: z.string().optional(),
  problem: z.string().optional(),
  try: z.string().optional(),
  nps: z.number().min(1).max(10),
  willContinue: z.enum(["yes", "no"]),
});

/**
 * 신규 사용자 폼 스키마
 * 이름, 전화번호, 필명(닉네임), 추천인 정보를 수집합니다.
 */
export const newUserFormSchema = z.object({
  name: z.string().min(2, "이름은 2글자 이상이어야 합니다."),
  phoneNumber: z.string().regex(/^01[0-9]{8,9}$/, "올바른 전화번호 형식이 아닙니다."),
  nickname: z.string().optional(),
  referrer: z.string(),
});

export type ActiveUserFormData = z.infer<typeof activeUserFormSchema>;
export type NewUserFormData = z.infer<typeof newUserFormSchema>;
