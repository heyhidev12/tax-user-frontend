import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../../components/layout";
import { EMAIL_DOMAINS, CARRIERS, VERIFICATION_TIMER_DURATION } from "../../libs/constants";
import { TERMS_CONTENT } from "../../libs/data/terms";
import { formatTimer } from "../../libs/utils";
import type {
  AgreementState,
  SignupFormData,
  SignupFormErrors,
  SignupFormSuccess,
} from "../../types/signup";
import "./style.scss";

// Initial form state
const INITIAL_FORM_DATA: SignupFormData = {
  memberType: "general",
  userId: "",
  name: "",
  emailId: "",
  emailDomain: "",
  emailDomainCustom: "",
  newsletter: false,
  carrier: "",
  phone: "",
  verificationCode: "",
  password: "",
  passwordConfirm: "",
};

const INITIAL_AGREEMENTS: AgreementState = {
  all: false,
  privacy: false,
  terms: false,
  marketing: false,
};

const Signup: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [showTermsModal, setShowTermsModal] = useState<string | null>(null);

  // Step 1: Agreements
  const [agreements, setAgreements] = useState<AgreementState>(INITIAL_AGREEMENTS);

  // Step 2: Form Data
  const [formData, setFormData] = useState<SignupFormData>(INITIAL_FORM_DATA);
  const [formErrors, setFormErrors] = useState<SignupFormErrors>({});
  const [formSuccess, setFormSuccess] = useState<SignupFormSuccess>({});
  
  // UI States
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [isVerificationSent, setIsVerificationSent] = useState(false);
  const [verificationTimer, setVerificationTimer] = useState(0);
  const [isUserIdChecked, setIsUserIdChecked] = useState(false);

  // ==========================================
  // Agreement Handlers
  // ==========================================
  const handleAllAgreement = (checked: boolean) => {
    setAgreements({
      all: checked,
      privacy: checked,
      terms: checked,
      marketing: checked,
    });
  };

  const handleAgreementChange = (key: keyof AgreementState, checked: boolean) => {
    const newAgreements = { ...agreements, [key]: checked };
    newAgreements.all = newAgreements.privacy && newAgreements.terms && newAgreements.marketing;
    setAgreements(newAgreements);
  };

  const canProceedStep1 = agreements.privacy && agreements.terms;

  // ==========================================
  // Form Handlers
  // ==========================================
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    // Clear errors when user types
    if (formErrors[name as keyof SignupFormErrors]) {
      setFormErrors((prev) => ({ ...prev, [name]: undefined }));
    }

    // Reset userId check when userId changes
    if (name === "userId") {
      setIsUserIdChecked(false);
      setFormSuccess((prev) => ({ ...prev, userId: undefined }));
    }
  };

  const clearInput = (field: keyof SignupFormData) => {
    setFormData((prev) => ({ ...prev, [field]: "" }));
  };

  // ==========================================
  // Validation Handlers
  // ==========================================
  const handleCheckUserId = () => {
    if (!formData.userId) {
      setFormErrors((prev) => ({ ...prev, userId: "아이디를 입력해주세요" }));
      return;
    }

    // Simulate API call
    const isDuplicate = formData.userId === "duplicate123";
    if (isDuplicate) {
      setFormErrors((prev) => ({ ...prev, userId: "이미 사용중인 아이디 입니다" }));
      setFormSuccess((prev) => ({ ...prev, userId: undefined }));
    } else {
      setFormSuccess((prev) => ({ ...prev, userId: "사용 가능한 아이디 입니다" }));
      setFormErrors((prev) => ({ ...prev, userId: undefined }));
      setIsUserIdChecked(true);
    }
  };

  const handleRequestVerification = () => {
    if (!formData.carrier) {
      setFormErrors((prev) => ({ ...prev, phone: "통신사를 선택해주세요" }));
      return;
    }
    if (!formData.phone) {
      setFormErrors((prev) => ({ ...prev, phone: "휴대폰 번호를 입력해주세요" }));
      return;
    }

    setIsVerificationSent(true);
    setVerificationTimer(VERIFICATION_TIMER_DURATION);
    setFormErrors((prev) => ({ ...prev, phone: undefined }));

    // Start countdown timer
    const timer = setInterval(() => {
      setVerificationTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleVerifyCode = () => {
    if (!formData.verificationCode) {
      setFormErrors((prev) => ({ ...prev, verificationCode: "인증번호를 입력해주세요" }));
      return;
    }

    // Simulate verification
    setFormSuccess((prev) => ({ ...prev, verificationCode: "인증이 완료되었습니다" }));
    setFormErrors((prev) => ({ ...prev, verificationCode: undefined }));
  };

  const validateStep2 = (): boolean => {
    const errors: SignupFormErrors = {};

    if (!formData.userId) {
      errors.userId = "아이디를 입력해주세요";
    } else if (!isUserIdChecked) {
      errors.userId = "아이디 중복확인을 해주세요";
    }

    if (!formData.name) {
      errors.name = "이름을 작성해주세요";
    }

    if (!formData.emailId || (!formData.emailDomain && !formData.emailDomainCustom)) {
      errors.email = "이메일을 작성해주세요";
    }

    if (!formData.phone) {
      errors.phone = "휴대폰 번호를 입력해주세요";
    }

    if (!formData.password) {
      errors.password = "비밀번호를 입력해주세요";
    }

    if (!formData.passwordConfirm) {
      errors.passwordConfirm = "비밀번호 확인을 입력해주세요";
    } else if (formData.password !== formData.passwordConfirm) {
      errors.passwordConfirm = "비밀번호가 일치하지 않습니다.";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ==========================================
  // Navigation Handlers
  // ==========================================
  const handleNext = () => {
    if (currentStep === 1 && canProceedStep1) {
      setCurrentStep(2);
    } else if (currentStep === 2 && validateStep2()) {
      setCurrentStep(3);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // ==========================================
  // Render
  // ==========================================
  return (
    <Layout navbarVariant="dark">
      <div className="signup-page">
        {/* Hero Banner */}
        <div className="signup-hero">
          <div className="signup-hero__overlay"></div>
          <div className="signup-hero__content">
            {/* <span className="signup-hero__label">REGISTER</span>
            <h1 className="signup-hero__title">세무법인 함께 회원 가입</h1> */}
          </div>
        </div>

        {/* Main Content */}
        <div className="signup-content">
          {/* Step Indicator */}
          <div className="step-indicator">
            <div className={`step ${currentStep === 1 ? "active" : ""} ${currentStep > 1 ? "completed" : ""}`}>
              <div className="step__circle">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <span className="step__label">STEP 01</span>
              <span className="step__name">약관동의</span>
            </div>
            <div className="step__line"></div>
            <div className={`step ${currentStep === 2 ? "active" : ""} ${currentStep > 2 ? "completed" : ""}`}>
              <div className="step__circle">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <span className="step__label">STEP 02</span>
              <span className="step__name">정보입력</span>
            </div>
            <div className="step__line"></div>
            <div className={`step ${currentStep === 3 ? "active" : ""}`}>
              <div className="step__circle">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <span className="step__label">STEP 03</span>
              <span className="step__name">가입완료</span>
            </div>
          </div>

          {/* Step 1: Terms Agreement */}
          {currentStep === 1 && (
            <div className="signup-card">
              <div className="agreement-section">
                <label className={`agreement-item agreement-item--all ${!canProceedStep1 ? "disabled" : ""}`}>
                  <input
                    type="checkbox"
                    checked={agreements.all}
                    onChange={(e) => handleAllAgreement(e.target.checked)}
                  />
                  <span className="checkbox"></span>
                  <span className="agreement-item__text" >모두 동의 (선택 정보 포함)</span>
                </label>

                <div className="agreement-list">
                  <div className="agreement-item">
                    <label>
                      <input
                        type="checkbox"
                        checked={agreements.privacy}
                        onChange={(e) => handleAgreementChange("privacy", e.target.checked)}
                      />
                      <span className="checkbox"></span>
                      <span className="agreement-item__text">[필수] 개인정보 처리 방침 이용 동의</span>
                    </label>
                    <button className="view-btn" onClick={() => setShowTermsModal("privacy")}>
                      보기
                    </button>
                  </div>

                  <div className="agreement-item">
                    <label>
                      <input
                        type="checkbox"
                        checked={agreements.terms}
                        onChange={(e) => handleAgreementChange("terms", e.target.checked)}
                      />
                      <span className="checkbox"></span>
                      <span className="agreement-item__text">[필수] 서비스 이용약관 동의</span>
                    </label>
                    <button className="view-btn" onClick={() => setShowTermsModal("terms")}>
                      보기
                    </button>
                  </div>

                  <div className="agreement-item">
                    <label>
                      <input
                        type="checkbox"
                        checked={agreements.marketing}
                        onChange={(e) => handleAgreementChange("marketing", e.target.checked)}
                      />
                      <span className="checkbox"></span>
                      <span className="agreement-item__text">[선택] 마케팅 정보 수신 동의</span>
                    </label>
                    <button className="view-btn" onClick={() => setShowTermsModal("marketing")}>
                      보기
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Information Input */}
          {currentStep === 2 && (
            <div className="signup-card">
              <form className="signup-form" onSubmit={(e) => e.preventDefault()}>
                {/* Member Type */}
                <div className="form-group">
                  <label className="form-label">
                    회원 유형 <span className="required">*</span>
                  </label>
                  <div className="radio-group">
                    <label className={`radio-item ${formData.memberType === "general" ? "active" : ""}`}>
                      <input
                        type="radio"
                        name="memberType"
                        value="general"
                        checked={formData.memberType === "general"}
                        onChange={handleInputChange}
                      />
                      <span className="radio-circle"></span>
                      일반 회원
                    </label>
                    <label className={`radio-item ${formData.memberType === "accountant" ? "active" : ""}`}>
                      <input
                        type="radio"
                        name="memberType"
                        value="accountant"
                        checked={formData.memberType === "accountant"}
                        onChange={handleInputChange}
                      />
                      <span className="radio-circle"></span>
                      세무사
                    </label>
                    <label className={`radio-item ${formData.memberType === "other" ? "active" : ""}`}>
                      <input
                        type="radio"
                        name="memberType"
                        value="other"
                        checked={formData.memberType === "other"}
                        onChange={handleInputChange}
                      />
                      <span className="radio-circle"></span>
                      기타
                    </label>
                  </div>
                </div>

                {/* User ID */}
                <div className="form-group">
                  <label className="form-label">
                    아이디 <span className="required">*</span>
                  </label>
                  <div className="input-with-button">
                    <input
                      type="text"
                      name="userId"
                      placeholder="아이디를 입력해주세요"
                      value={formData.userId}
                      onChange={handleInputChange}
                      className={formErrors.userId ? "error" : formSuccess.userId ? "success" : ""}
                    />
                    <button type="button" className={formSuccess.userId ? "action-btn resend": "action-btn"} onClick={handleCheckUserId}>
                      중복 확인
                    </button>
                  </div>
                  {formErrors.userId && <span className="error-message">{formErrors.userId}</span>}
                  {formSuccess.userId && <span className="success-message">{formSuccess.userId}</span>}
                </div>

                {/* Name */}
                <div className="form-group">
                  <label className="form-label">
                    이름 <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    placeholder="이름을 입력해주세요"
                    value={formData.name}
                    onChange={handleInputChange}
                    className={formErrors.name ? "error" : ""}
                  />
                  {formErrors.name && <span className="error-message">{formErrors.name}</span>}
                </div>

                {/* Email */}
                <div className="form-group">
                  <label className="form-label">
                    이메일 <span className="required">*</span>
                  </label>
                  <div className="email-input">
                    <input
                      type="text"
                      name="emailId"
                      placeholder="이메일을 입력해주세요"
                      value={formData.emailId}
                      onChange={handleInputChange}
                      className={formErrors.email ? "error" : ""}
                    />
                    <span className="email-at">@</span>
                    <input
                      type="text"
                      name="emailDomainCustom"
                      placeholder="도메인"
                      value={formData.emailDomainCustom}
                      onChange={handleInputChange}
                      className={formErrors.email ? "error" : ""}
                      readOnly={formData.emailDomain !== "" && formData.emailDomain !== "custom"}
                    />
                    <select
                      name="emailDomain"
                      value={formData.emailDomain}
                      onChange={(e) => {
                        handleInputChange(e);
                        if (e.target.value !== "custom" && e.target.value !== "") {
                          setFormData((prev) => ({ ...prev, emailDomainCustom: e.target.value }));
                        } else if (e.target.value === "custom") {
                          setFormData((prev) => ({ ...prev, emailDomainCustom: "" }));
                        }
                      }}
                    >
                      {EMAIL_DOMAINS.map((domain) => (
                        <option key={domain.value} value={domain.value}>
                          {domain.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {formErrors.email && <span className="error-message">{formErrors.email}</span>}
                  <label className="newsletter-check">
                    <input
                      type="checkbox"
                      name="newsletter"
                      checked={formData.newsletter}
                      onChange={handleInputChange}
                    />
                    <span className="checkbox"></span>
                    뉴스레터 신청
                  </label>
                </div>

                {/* Phone */}
                <div className="form-group">
                  <label className="form-label">
                    휴대폰 번호 <span className="required">*</span>
                  </label>
                  <div className="phone-input">
                    <select name="carrier" value={formData.carrier} onChange={handleInputChange}>
                      {CARRIERS.map((carrier) => (
                        <option key={carrier.value} value={carrier.value}>
                          {carrier.label}
                        </option>
                      ))}
                    </select>
                    <input
                      type="tel"
                      name="phone"
                      placeholder="휴대폰 번호를 입력해주세요"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className={formErrors.phone ? "error" : ""}
                    />
                    <button
                      type="button"
                      className={`action-btn ${isVerificationSent ? "resend" : ""}`}
                      onClick={handleRequestVerification}
                    >
                      {isVerificationSent ? "인증 재요청" : "인증 요청"}
                    </button>
                  </div>
                  {formErrors.phone && <span className="error-message">{formErrors.phone}</span>}
                </div>

                {/* Verification Code */}
                {isVerificationSent && (
                  <div className="form-group">
                    <label className="form-label">
                      인증번호 <span className="required">*</span>
                    </label>
                    <div className="input-with-button">
                      <div className="input-with-timer">
                        <input
                          type="text"
                          name="verificationCode"
                          placeholder="인증번호를 입력해주세요"
                          value={formData.verificationCode}
                          onChange={handleInputChange}
                          className={formErrors.verificationCode ? "error" : ""}
                        />
                        {verificationTimer > 0 && (
                          <span className="timer">{formatTimer(verificationTimer)}</span>
                        )}
                      </div>
                      <button type="button" className="action-btn" onClick={handleVerifyCode}>
                        인증 확인
                      </button>
                    </div>
                    {formErrors.verificationCode && (
                      <span className="error-message">{formErrors.verificationCode}</span>
                    )}
                    {formSuccess.verificationCode && (
                      <span className="success-message">{formSuccess.verificationCode}</span>
                    )}
                  </div>
                )}

                {/* Password */}
                <div className="form-group">
                  <label className="form-label">
                    비밀번호 <span className="required">*</span>
                  </label>
                  <div className="password-input">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      placeholder="비밀번호를 입력해주세요"
                      value={formData.password}
                      onChange={handleInputChange}
                      className={formErrors.password ? "error" : ""}
                    />
                    <div className="password-actions">
                      <button type="button" className="icon-btn" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? (
                          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#000" strokeWidth="1.5">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#000" strokeWidth="1.5">
                            <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                            <line x1="1" y1="1" x2="23" y2="23" />
                          </svg>
                        )}
                      </button>
                      {formData.password && (
                        <button type="button" className="icon-btn clear" onClick={() => clearInput("password")}>
                          <svg viewBox="0 0 24 24" width="22" height="22">
                            <circle cx="12" cy="12" r="10" fill="#BEBEC7" />
                            <path d="M8 8L16 16M16 8L8 16" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                  {formErrors.password && <span className="error-message">{formErrors.password}</span>}
                </div>

                {/* Password Confirm */}
                <div className="form-group">
                  <label className="form-label">
                    비밀번호 확인 <span className="required">*</span>
                  </label>
                  <div className="password-input">
                    <input
                      type={showPasswordConfirm ? "text" : "password"}
                      name="passwordConfirm"
                      placeholder="비밀번호를 다시 입력해주세요"
                      value={formData.passwordConfirm}
                      onChange={handleInputChange}
                      className={formErrors.passwordConfirm ? "error" : ""}
                    />
                    <div className="password-actions">
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                      >
                        {showPasswordConfirm ? (
                          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#000" strokeWidth="1.5">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#000" strokeWidth="1.5">
                            <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                            <line x1="1" y1="1" x2="23" y2="23" />
                          </svg>
                        )}
                      </button>
                      {formData.passwordConfirm && (
                        <button type="button" className="icon-btn clear" onClick={() => clearInput("passwordConfirm")}>
                          <svg viewBox="0 0 24 24" width="22" height="22">
                            <circle cx="12" cy="12" r="10" fill="#BEBEC7" />
                            <path d="M8 8L16 16M16 8L8 16" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                  {formErrors.passwordConfirm && (
                    <span className="error-message">{formErrors.passwordConfirm}</span>
                  )}
                </div>
              </form>
            </div>
          )}

          {/* Step 3: Complete */}
          {currentStep === 3 && (
            <div className="signup-card signup-card--complete">
              <div className="complete-content">
                <div className="complete-icon">
                  <svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="#00a89e" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <h2 className="complete-title">회원가입이 완료되었습니다</h2>
                <p className="complete-message">회원이 되신 것을 진심으로 환영합니다</p>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="signup-buttons">
            {currentStep === 1 && (
              <button
                className={`btn btn--primary ${!canProceedStep1 ? "disabled" : ""}`}
                onClick={handleNext}
                disabled={!canProceedStep1}
              >
                다음
              </button>
            )}
            {currentStep === 2 && (
              <>
                <button className="btn btn--outline" onClick={handlePrev}>
                  이전
                </button>
                <button className="btn btn--primary" onClick={handleNext}>
                  다음
                </button>
              </>
            )}
            {currentStep === 3 && (
              <button className="btn btn--primary" onClick={() => navigate("/login")}>
                로그인
              </button>
            )}
          </div>
        </div>

        {/* Terms Modal */}
        {showTermsModal && (
          <div className="terms-modal">
            <div className="terms-modal__backdrop" onClick={() => setShowTermsModal(null)} />
            <div className="terms-modal__content">
              <header className="terms-modal__header">
                <h2>{TERMS_CONTENT[showTermsModal]?.title}</h2>
                <button className="terms-modal__close" onClick={() => setShowTermsModal(null)}>
                  <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="1.5" fill="none">
                    <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </header>
              <div className="terms-modal__body">
                <pre>{TERMS_CONTENT[showTermsModal]?.content}</pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Signup;
