import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Header from '@/components/common/Header';
import Menu from '@/components/Menu';
import { post } from '@/lib/api';
import { API_BASE_URL, API_ENDPOINTS } from '@/config/api';
import { toast } from 'react-toastify';
import Footer from '../Footer';

interface LoginResponse {
  accessToken: string;
  member?: {
    id: number;
    loginId: string;
    name: string;
    email?: string;
    phoneNumber?: string;
    memberType?: string;
    isApproved?: boolean;
    status?: string;
    newsletterSubscribed?: boolean;
    affiliation?: string | null;
    provider?: string | null;
    providerId?: string | null;
    createdAt?: string;
    updatedAt?: string;
  };
}

const Login: React.FC = () => {
  const router = useRouter();
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Handle SNS login errors passed via query parameter
  useEffect(() => {
    if (!router.isReady) return;
    
    const { error } = router.query;

    if (!error) return;

    if (error === 'WITHDRAWN') {
      toast.error('This account has been withdrawn');
    } else {
      // Fallback for any other SNS error codes
      toast.error('SNS 로그인 중 오류가 발생했습니다. 다시 시도해주세요.');
    }

    // Clean up URL so the error param does not persist
    router.replace('/login', undefined, { shallow: true });
  }, [router.isReady, router.query]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!userId || !password) {
      setError('아이디와 비밀번호를 입력해주세요.');
      return;
    }

    setIsLoading(true);

    try {
      const { data, error: apiError, status } = await post<LoginResponse>(
        API_ENDPOINTS.AUTH.LOGIN,
        {
          loginId: userId,
          password: password,
          autoLogin: rememberMe,
        }
      ); 

      if (apiError || !data) {
        if (status === 401) {
          setError('아이디 또는 비밀번호가 올바르지 않습니다.');
        } else {
          setError(apiError || '로그인에 실패했습니다. 다시 시도해주세요.');
        }
        return;
      }

      // 토큰 저장
      if (data.accessToken) {
        localStorage.setItem('accessToken', data.accessToken);

        // 자동 로그인 설정 시 토큰을 더 오래 유지
        if (rememberMe) {
          localStorage.setItem('autoLogin', 'true');
        } else {
          localStorage.removeItem('autoLogin');
        }

        // 사용자 정보 저장 (member 객체)
        if (data.member) {
          localStorage.setItem('user', JSON.stringify(data.member));
        }
      }

      // 로그인 성공 후 메인 페이지로 이동
      router.push('/');
    } catch (err) {
      setError('네트워크 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = (provider: 'google' | 'kakao' | 'naver') => {
    const socialEndpoints = {
      google: API_ENDPOINTS.AUTH.GOOGLE,
      kakao: API_ENDPOINTS.AUTH.KAKAO,
      naver: API_ENDPOINTS.AUTH.NAVER,
    };

    // SNS 로그인은 항상 백엔드로 직접 리다이렉트만 수행
    window.location.href = `${API_BASE_URL}${socialEndpoints[provider]}`;
  };

  return (
    <div className="auth-page-container">
      <Header variant="transparent" onMenuClick={() => setIsMenuOpen(true)} />
      <Menu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

      <div className="login-page">
        <div className="login-container">
          <div className="login-form-wrapper">
            <h1 className="login-title">로그인</h1>

            <form className="login-form" onSubmit={handleLogin}>
              <div className={`form-group ${error ? 'error' : ''}`}>
                <label htmlFor="userId">아이디</label>
                <div className="input-wrapper">
                  <input
                    type="text"
                    id="userId"
                    name="userId"
                    placeholder="아이디를 입력해주세요"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    disabled={isLoading}
                  />
                  {userId && (
                    <button
                      type="button"
                      className="clear-btn"
                      onClick={() => setUserId('')}
                      aria-label="아이디 지우기"
                    >
                      <svg viewBox="0 0 24 24" width="18" height="18">
                        <circle cx="12" cy="12" r="10" fill="#d8d8d8" />
                        <path
                          d="M8 8L16 16M16 8L8 16"
                          stroke="#fff"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              <div className={`form-group ${error ? 'error' : ''}`}>
                <label htmlFor="password">비밀번호</label>
                <div className="input-wrapper">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    placeholder="비밀번호를 입력해주세요"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                  />
                  <div className="input-actions">
                    {password && (
                      <button
                        type="button"
                        className="toggle-password"
                        onClick={() => setShowPassword((prev) => !prev)}
                        aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 표시'}
                      >
                        {showPassword ? (
                          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#999">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" strokeWidth="2" />
                            <circle cx="12" cy="12" r="3" strokeWidth="2" />
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#999">
                            <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" strokeWidth="2" strokeLinecap="round" />
                            <line x1="1" y1="1" x2="23" y2="23" strokeWidth="2" strokeLinecap="round" />
                          </svg>
                        )}
                      </button>
                    )}
                    {password && (
                      <button
                        type="button"
                        className="clear-btn"
                        onClick={() => setPassword('')}
                        aria-label="비밀번호 지우기"
                      >
                        <svg viewBox="0 0 24 24" width="18" height="18">
                          <circle cx="12" cy="12" r="10" fill="#d8d8d8" />
                          <path
                            d="M8 8L16 16M16 8L8 16"
                            stroke="#fff"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="form-options">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    disabled={isLoading}
                  />
                  <span className="checkmark" />
                  로그인 유지
                </label>
                <div className="find-links">
                  <Link href="/find-username">아이디 찾기</Link>
                  <span className='divider-links'></span>
                  <Link href="/find-password">비밀번호 찾기</Link>
                </div>
              </div>

              {error && (
                <div className="error-message">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="#e74c3c" strokeWidth="2" />
                    <line x1="12" y1="8" x2="12" y2="12" stroke="#e74c3c" strokeWidth="2" strokeLinecap="round" />
                    <circle cx="12" cy="16" r="1" fill="#e74c3c" />
                  </svg>
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="login-btn"
                disabled={isLoading}
              >
                {isLoading ? '로그인 중...' : '로그인'}
              </button>
            </form>

            <div className="signup-link">
              아직 회원이 아니신가요?
              <Link href="/signup">회원가입</Link>
            </div>

            <div className="divider" />

            <div className="sns-login">
              <p className="sns-title">SNS 계정으로 로그인하기</p>
              <div className="sns-buttons">
                <button
                  type="button"
                  className="sns-btn sns-btn--kakao"
                  onClick={() => handleSocialLogin('kakao')}
                  disabled={isLoading}
                  aria-label="카카오 로그인"
                >
                  <svg viewBox="0 0 24 24" width="24" height="24">
                    <path
                      d="M12 3C6.48 3 2 6.58 2 11c0 2.84 1.89 5.33 4.71 6.73-.15.53-.97 3.43-.99 3.64 0 0-.02.17.09.24.11.07.24.02.24.02.31-.04 3.64-2.38 4.22-2.79.56.08 1.14.16 1.73.16 5.52 0 10-3.58 10-8 0-4.42-4.48-8-10-8z"
                      fill="#3C1E1E"
                    />
                  </svg>
                </button>
                <button
                  type="button"
                  className="sns-btn sns-btn--naver"
                  onClick={() => handleSocialLogin('naver')}
                  disabled={isLoading}
                  aria-label="네이버 로그인"
                >
                  <span className="naver-n">N</span>
                </button>
                <button
                  type="button"
                  className="sns-btn sns-btn--google"
                  onClick={() => handleSocialLogin('google')}
                  disabled={isLoading}
                  aria-label="구글 로그인"
                >
                  <svg viewBox="0 0 24 24" width="20" height="20">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
              <Footer />
    </div>
  );
};

export default Login;
