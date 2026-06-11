import { z } from 'zod';
import { validateKakaoId, validatePhone } from './contactValidation';

export const onboardingSchema = z
  .object({
    realName: z.string().trim().min(2, '이름은 2글자 이상이어야 합니다.'),
    nickname: z.string().trim().min(1, '필명을 입력해주세요.'),
    phone: z.string(),
    kakaoId: z.string(),
    referrer: z.string(),
    activeContactTab: z.enum(['phone', 'kakao']),
  })
  .superRefine((v, ctx) => {
    const ok =
      v.activeContactTab === 'phone'
        ? validatePhone(v.phone) !== null
        : validateKakaoId(v.kakaoId) !== null;
    if (ok) return;
    ctx.addIssue({
      code: 'custom',
      message: '연락처를 입력해주세요.',
      path: [v.activeContactTab === 'phone' ? 'phone' : 'kakaoId'],
    });
  });

export type OnboardingFormSchema = z.infer<typeof onboardingSchema>;

export const ONBOARDING_FORM_DEFAULTS: OnboardingFormSchema = {
  realName: '',
  nickname: '',
  phone: '',
  kakaoId: '',
  referrer: '',
  activeContactTab: 'phone',
};
