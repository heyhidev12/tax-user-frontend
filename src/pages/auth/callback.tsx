import { useEffect } from 'react';
import { useRouter } from 'next/router';

/**
 * OAuth 콜백 페이지
 *
 * 소셜 로그인(Google, Kakao, Naver) 후 리다이렉트되는 페이지입니다.
 * URL 쿼리에서 토큰을 추출하여 localStorage에 저장하고 메인 페이지로 이동합니다.
 */
const AuthCallback = () => {
  const router = useRouter();

  useEffect(() => {
    if (!router.isReady) return;
  
    const token = router.query.token as string;
    const error = router.query.error as string;
  
    // SUCCESS
    if (token) {
      localStorage.setItem('accessToken', token);
      router.replace('/');
      return;
    }
  
    // NOT REGISTERED USER
    if (error === 'NOT_REGISTERED') {
      router.replace('/signup');
      return;
    }
  
    // WITHDRAWN USER
    if (error === 'WITHDRAWN') {
      router.replace('/signup?error=WITHDRAWN');
      return;
    }
  
    // FALLBACK
    router.replace('/login');
  
  }, [router.isReady]);
  
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#151515',
        color: '#fff',
      }}
    >
      <p>로그인 처리 중...</p>
    </div>
  );
};

export default AuthCallback;
