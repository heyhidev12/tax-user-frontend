import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Header from '@/components/common/Header';
import Menu from '@/components/Menu';
import Footer from '@/components/Footer';
import { TextField } from '@/components/common/TextField';
import Tab from '@/components/common/Tab';
import Button from '@/components/common/Button';
import { post } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';
import { formatPhoneInput, validatePhone } from '@/lib/phoneValidation';
// styles는 _app.tsx에서 import됨 (FindUsername과 동일한 스타일 사용)

type TabType = 'sms' | 'email';
type StepType = 'input' | 'verification';

const tabItems = [
  { id: 'sms', label: '문자 / 카카오 인증' },
  { id: 'email', label: '이메일 인증' },
];

const MAX_FAIL = 5; // Maximum number of verification failures

const FindPassword: React.FC = () => {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('sms');
  const [step, setStep] = useState<StepType>('input');
  const [userId, setUserId] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [failCount, setFailCount] = useState(0);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const verificationCodeInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          const newTime = prev - 1;
          if (newTime <= 0) {
            setIsTimerActive(false);
          }
          return newTime;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerActive, timeLeft]);

  // Autofocus verification code input on error
  useEffect(() => {
    if (error && step === 'verification' && verificationCodeInputRef.current) {
      verificationCodeInputRef.current.focus();
    }
  }, [error, step]);

  const handleRequestVerification = useCallback(async () => {
    setError('');
    setIsLoading(true);

    if (!userId) {
      setError('아이디를 입력해주세요.');
      setIsLoading(false);
      return;
    }

    try {
      if (activeTab === 'sms') {
        const phoneResult = validatePhone(phone);
        if (!phoneResult.valid) {
          setError(phoneResult.error ?? '휴대폰 번호를 입력해주세요.');
          setIsLoading(false);
          return;
        }

        const response = await post(API_ENDPOINTS.AUTH.FIND_PASSWORD_PHONE_SEND, {
          loginId: userId,
          phoneNumber: phoneResult.normalized,
        });

        if (response.error) {
          const message =
            response.error ||
            (response.status === 404
              ? '해당 정보로 가입된 회원이 없습니다.'
              : '인증번호 발송에 실패했습니다.');
          // 백엔드 메시지를 알림으로 보여주고, 다음 단계로 이동하지 않음
          alert(message);
          setError(message);
          return;
        }

        // 성공한 경우에만 인증번호 단계로 이동
        setTimeLeft(300); // 5:00 (5 minutes)
        setIsTimerActive(true);
        setFailCount(0); // Reset fail count on new code
        setError(''); // Clear previous errors
        setVerificationCode(''); // Clear previous code
        setStep('verification');
      } else {
        if (!email) {
          setError('이메일을 입력해주세요.');
          setIsLoading(false);
          return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          setError('올바른 이메일 형식을 입력해주세요.');
          setIsLoading(false);
          return;
        }

        const response = await post(API_ENDPOINTS.AUTH.FIND_PASSWORD_EMAIL_SEND, {
          loginId: userId,
          email: email,
        });

        if (response.error) {
          const message =
            response.error ||
            (response.status === 404
              ? '해당 정보로 가입된 회원이 없습니다.'
              : '인증번호 발송에 실패했습니다.');
          // 백엔드 메시지를 알림으로 보여주고, 다음 단계로 이동하지 않음
          alert(message);
          setError(message);
          return;
        }

        // 성공한 경우에만 인증번호 단계로 이동
        setTimeLeft(300); // 5:00 (5 minutes)
        setIsTimerActive(true);
        setFailCount(0); // Reset fail count on new code
        setError(''); // Clear previous errors
        setVerificationCode(''); // Clear previous code
        setStep('verification');
      }
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        '인증번호 발송에 실패했습니다. 다시 시도해주세요.';
      alert(message);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, userId, phone, email]);

  const handleVerifyCode = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError('');
    setIsLoading(true);

    if (!verificationCode) {
      setError('인증번호를 입력해주세요.');
      setIsLoading(false);
      return;
    }

    // Check if code expired
    if (timeLeft <= 0 || !isTimerActive) {
      setError('인증 시간이 만료되었습니다. 인증번호를 재요청해 주세요.');
      setIsLoading(false);
      return;
    }

    // Check if max attempts reached
    if (failCount >= MAX_FAIL) {
      setError('인증 시도 가능 횟수를 초과했습니다. 인증번호를 재요청해 주세요.');
      setIsLoading(false);
      return;
    }

    try {
      let response;
      if (activeTab === 'sms') {
        const phoneResult = validatePhone(phone);
        if (!phoneResult.valid) {
          setError(phoneResult.error ?? '휴대폰 번호를 확인해주세요.');
          setIsLoading(false);
          return;
        }
        response = await post<{ resetToken: string }>(API_ENDPOINTS.AUTH.FIND_PASSWORD_PHONE_VERIFY, {
          loginId: userId,
          phoneNumber: phoneResult.normalized,
          verificationCode: verificationCode,
        });
      } else {
        response = await post<{ resetToken: string }>(API_ENDPOINTS.AUTH.FIND_PASSWORD_EMAIL_VERIFY, {
          loginId: userId,
          email: email,
          verificationCode: verificationCode,
        });
      }

      if (response.error) {
        const newFailCount = failCount + 1;
        setFailCount(newFailCount);
        
        // Display backend error message as-is
        setError(response.error);
        
        // Clear verification code input on error to allow retry
        setVerificationCode('');
        
        if (newFailCount >= MAX_FAIL) {
          setError('인증 시도 가능 횟수를 초과했습니다. 인증번호를 재요청해 주세요.');
        }
        return;
      }

      if (response.data?.resetToken) {
        setResetToken(response.data.resetToken);
        setIsTimerActive(false);
        setFailCount(0); // Reset on success
        router.push(`/reset-password?token=${encodeURIComponent(response.data.resetToken)}`);
      } else {
        setError('비밀번호 재설정 토큰을 받지 못했습니다.');
      }
    } catch {
      const newFailCount = failCount + 1;
      setFailCount(newFailCount);
      setError('인증에 실패했습니다. 다시 시도해주세요.');
      setVerificationCode('');
      
      if (newFailCount >= MAX_FAIL) {
        setError('인증 시도 가능 횟수를 초과했습니다. 인증번호를 재요청해 주세요.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [verificationCode, activeTab, userId, phone, email, router, timeLeft, isTimerActive, failCount]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId as TabType);
    setStep('input');
    setUserId('');
    setPhone('');
    setEmail('');
    setVerificationCode('');
    setError('');
    setIsTimerActive(false);
    setTimeLeft(0);
    setFailCount(0); // Reset fail count on tab change
  };

  const handleFindUsername = () => router.push('/find-username');

  // Check if input form is valid
  const isInputFormValid = userId && (activeTab === 'sms' ? phone : email) && !isLoading;

  // Check if verification form is valid
  const isVerificationFormValid = verificationCode && !isLoading && failCount < MAX_FAIL && (timeLeft > 0 || isTimerActive);

  // Handle Enter key for input form
  const handleInputFormKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && isInputFormValid) {
      e.preventDefault();
      handleRequestVerification();
    }
  }, [isInputFormValid, handleRequestVerification]);

  // Handle Enter key for verification form
  const handleVerificationFormKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && isVerificationFormValid) {
      e.preventDefault();
      handleVerifyCode();
    }
  }, [isVerificationFormValid, handleVerifyCode]);

  const renderInputForm = () => (
    <div onKeyDown={handleInputFormKeyDown} style={{ display: 'contents' }}>
      <div className="find-username-form-container">
        <form
          className="find-username-form"
          onSubmit={(e) => {
            e.preventDefault();
            handleRequestVerification();
          }}
        >
          <div className="find-username-form-fields">
            <TextField
              variant="line"
              label="아이디"
              placeholder="아이디를 입력해주세요"
              value={userId}
              onChange={setUserId}
              fullWidth
            />

            {activeTab === 'sms' ? (
              <div className="find-username-field-with-button">
                <TextField
                  variant="line"
                  label="휴대폰 번호"
                  type="tel"
                  placeholder="01000000000"
                  value={phone}
                  onChange={(val) => setPhone(formatPhoneInput(val))}
                  fullWidth
                />
                <Button
                  type="line-white"
                  size="medium"
                  onClick={handleRequestVerification}
                  disabled={!userId.trim() || !phone.trim() || isLoading}
                  className={userId.trim() && phone.trim() ? 'active' : ''}
                >
                  {isLoading ? '발송 중...' : '인증 요청'}
                </Button>
              </div>
            ) : (
              <TextField
                variant="line"
                label="이메일"
                type="email"
                placeholder="이메일을 입력해주세요"
                value={email}
                onChange={setEmail}
                fullWidth
              />
            )}

          </div>
        </form>
      </div>

      <div className="find-username-button-wrapper">
        <Button
          type="primary"
          size="large"
          disabled={!isInputFormValid}
          onClick={handleRequestVerification}
        >
          {isLoading ? '확인 중...' : '확인'}
        </Button>
      </div>

      <div className="find-username-bottom-links">
        <Button type="text-link-gray" size="small" onClick={handleFindUsername}>
          아이디 찾기
        </Button>
        <span className="find-username-link-divider">|</span>
        <Button type="text-link-gray" size="small" onClick={() => router.push('/signup')}>
          회원가입
        </Button>
      </div>
    </div>
  );

  const renderVerificationForm = () => (
    <div onKeyDown={handleVerificationFormKeyDown} style={{ display: 'contents' }}>
      {activeTab === 'email' && (
        <p className="auth-verification-subtitle">
         <span>"{email}"</span> (으)로 전달된<br />
          인증번호를 입력해주세요.
        </p>
      )}
      <div className="find-username-form-container">
        <form className="find-username-form" onSubmit={handleVerifyCode}>
          <div className="find-username-form-fields">
            {activeTab === 'sms' ? (
              <>
                <TextField
                  variant="line"
                  label="아이디"
                  value={userId}
                  readOnly
                  fullWidth
                />
                <div className="find-username-field-with-button">
                  <TextField
                    variant="line"
                    label="휴대폰 번호"
                    type="tel"
                    value={phone}
                    readOnly
                    fullWidth
                  />
                  <Button
                    type="line-white"
                    size="medium"
                    onClick={handleRequestVerification}
                    disabled={isLoading}
                  >
                    {isLoading ? '발송 중...' : '인증 재요청'}
                  </Button>
                </div>
              </>
            ) : null}

            <div className="find-username-verification-code-wrapper">
              <TextField
                variant="line"
                placeholder="인증번호를 입력해주세요"
                value={verificationCode}
                onChange={setVerificationCode}
                maxLength={6}
                timer={typeof timeLeft === 'number' ? timeLeft : 0}
                errorMessage={error || undefined}
                fullWidth
                error={!!error}
                inputRef={verificationCodeInputRef}
              />
              {activeTab === 'email' && (
                <button
                  type="button"
                  className="find-username-resend-link"
                  onClick={handleRequestVerification}
                  disabled={isLoading}
                >
                  {isLoading ? '발송 중...' : '인증번호 재요청'}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>


      <div className="find-username-button-wrapper">
        <Button
          type="primary"
          size="large"
          disabled={!isVerificationFormValid}
          onClick={() => handleVerifyCode()}
        >
          {isLoading ? '확인 중...' : '확인'}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="auth-page-container">
      <Header variant="transparent" onMenuClick={() => setIsMenuOpen(true)} />
      <Menu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
      <section className="auth-content-section">
        <h1 className="auth-page-title">
          {step === 'verification' && activeTab === 'email' ? '인증번호 입력' : '비밀번호 찾기'}
        </h1>
        {step === 'input' && (
          <>
            <p className="auth-page-subtitle">사용중인 아이디를 인증 완료 시<br />비밀번호를 재설정할 수 있습니다.</p>
            <div className="find-username-tab-wrapper">
              <Tab
                items={tabItems}
                activeId={activeTab}
                onChange={handleTabChange}
                style="box"
                size="medium"
                showActiveDot={false}
                fullWidth
              />
            </div>
          </>
        )}
        {step === 'input' && renderInputForm()}
        {step === 'verification' && renderVerificationForm()}
      </section>
      <Footer />
    </div>
  );
};

export default FindPassword;
