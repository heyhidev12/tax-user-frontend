import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import Header from '@/components/common/Header';
import Menu from '@/components/Menu';
import Footer from '@/components/Footer';
import PageHeader from '@/components/common/PageHeader';
import Checkbox from '@/components/common/Checkbox';
import Button from '@/components/common/Button';
import { get, post } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';
import styles from './apply.module.scss';

interface ConsultationFormData {
  consultationField: string;
  taxAccountant: string;
  name: string;
  phone: string;
  additionalRequest: string;
  privacyAgreement: boolean;
  termsAgreement: boolean;
}

interface ConsultationApiRequest {
  name: string;
  phoneNumber: string;
  consultingField: string;
  assignedTaxAccountant: string;
  content: string;
  privacyAgreed: boolean;
  termsAgreed: boolean;
  memberFlag: 'MEMBER' | 'NON_MEMBER';
}

// API 응답 타입
interface CategoryItem {
  id: number;
  name: string;
  isExposed: boolean;
  majorCategoryId: number;
  majorCategoryName: string;
}

interface MemberItem {
  id: number;
  name: string;
  isExposed: boolean;
}

interface MembersResponse {
  items: MemberItem[];
  total: number;
  page: number;
  limit: number;
}

interface SelectOption {
  value: string;
  label: string;
}

interface UserProfile {
  id: number;
  loginId: string;
  name: string;
  phoneNumber?: string;
  email?: string;
}

const ConsultationApplyPage: React.FC = () => {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isFieldDropdownOpen, setIsFieldDropdownOpen] = useState(false);
  const [isAccountantDropdownOpen, setIsAccountantDropdownOpen] = useState(false);
  const [searchFieldQuery, setSearchFieldQuery] = useState('');
  const [searchAccountantQuery, setSearchAccountantQuery] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitAttempted, setIsSubmitAttempted] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // API에서 가져온 데이터
  const [consultationFields, setConsultationFields] = useState<SelectOption[]>([]);
  const [taxAccountants, setTaxAccountants] = useState<SelectOption[]>([]);

  // 로그인 상태 확인 및 API 데이터 가져오기
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    setIsLoggedIn(!!token);

    // 로그인 상태일 때 사용자 정보 자동 입력
    const fetchUserProfile = async () => {
      if (!token) return;
      try {
        const response = await get<UserProfile>(API_ENDPOINTS.AUTH.ME);
        if (response.data) {
          setFormData(prev => ({
            ...prev,
            name: response.data!.name || '',
            phone: response.data!.phoneNumber || '',
          }));
        }
      } catch (e) {
        console.error('Failed to fetch user profile:', e);
      }
    };

    if (token) {
      fetchUserProfile();
    }

    // 상담 분야 (카테고리) 가져오기
    // expertId가 있거나 expert-specific workAreas가 이미 로드되었으면 스킵
    const fetchCategories = async () => {
      // router가 준비되지 않았으면 나중에 다시 시도
      if (!router.isReady) {
        return;
      }

      // expertId가 있으면 스킵 (expert-specific workAreas가 로드될 것임)
      if (router.query.expertId) {
        console.log('[Consultation Apply] Skipping initial categories fetch, expertId present');
        return;
      }

      // expert-specific workAreas가 이미 로드되었으면 스킵
      if (expertWorkAreasLoadedRef.current) {
        console.log('[Consultation Apply] Skipping initial categories fetch, expert workAreas already loaded');
        return;
      }

      try {
        const response = await get<CategoryItem[]>(API_ENDPOINTS.BUSINESS_AREAS_CATEGORIES);
        if (response.data) {
          const options: SelectOption[] = response.data
            .filter(item => item.isExposed)
            .map(item => ({
              value: item.id.toString(),
              label: item.name
            }));
          setConsultationFields(options);
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      }
    };

    fetchCategories();
  }, [router.isReady, router.query.expertId]);

  // expertId가 query에 있으면 전문가 정보를 가져와서 자동 선택
  useEffect(() => {
    // router가 준비될 때까지 대기
    if (!router.isReady) return;

    const expertId = router.query.expertId as string;

    // expertId가 없거나 이미 해당 expertId로 설정되어 있으면 스킵
    if (!expertId) {
      console.log('[Consultation Apply] No expertId in query, skipping');
      return;
    }

    // 이미 같은 expertId로 설정되어 있으면 스킵
    if (formData.taxAccountant === expertId) {
      console.log('[Consultation Apply] Expert already selected, skipping');
      return;
    }

    const fetchExpertAndPreFill = async () => {
      console.log('[Consultation Apply] Starting expert pre-fill for expertId:', expertId);
      try {
        // 전문가 정보 가져오기
        const expertResponse = await get<{
          id: number;
          name: string;
          workAreas: string[] | Array<{ id: number; value: string }>;
        }>(`${API_ENDPOINTS.MEMBERS}/${expertId}`);

        if (expertResponse.data) {
          const expert = expertResponse.data;

          // 첫 번째 workArea ID 추출
          let firstWorkAreaId: string | null = null;
          if (expert.workAreas && expert.workAreas.length > 0) {
            const firstWorkArea = expert.workAreas[0];

            if (typeof firstWorkArea === 'object' && firstWorkArea.id) {
              firstWorkAreaId = firstWorkArea.id.toString();
              console.log('[Consultation Apply] Extracted workAreaId from object:', firstWorkAreaId);
            } else if (typeof firstWorkArea === 'string') {
              // workArea가 문자열인 경우, 전체 카테고리에서 ID 찾기
              const categoriesResponse = await get<CategoryItem[]>(API_ENDPOINTS.BUSINESS_AREAS_CATEGORIES);
              if (categoriesResponse.data) {
                const matchingCategory = categoriesResponse.data.find(
                  cat => cat.name === firstWorkArea
                );
                if (matchingCategory) {
                  firstWorkAreaId = matchingCategory.id.toString();
                  console.log('[Consultation Apply] Found workAreaId from categories:', firstWorkAreaId);
                } else {
                  console.log('[Consultation Apply] Could not find matching category for:', firstWorkArea);
                }
              }
            }
          } else {
            console.log('[Consultation Apply] Expert has no workAreas');
          }

          // 1. 먼저 전문가의 업무 분야 목록 가져오기
          console.log('[Consultation Apply] Step 1: Fetching workAreas for expert');
          const categoriesResponse = await get<CategoryItem[]>(
            `${API_ENDPOINTS.BUSINESS_AREAS_CATEGORIES}?memberId=${expertId}`
          );

          if (categoriesResponse.data && categoriesResponse.data.length > 0) {
            const workAreaOptions: SelectOption[] = categoriesResponse.data
              .filter(item => item.isExposed)
              .map(item => ({
                value: item.id.toString(),
                label: item.name
              }));
            console.log('[Consultation Apply] Step 1: Fetched workAreas:', workAreaOptions.length, workAreaOptions);
            // 전문가의 모든 업무 분야를 consultationFields에 설정 (드롭다운에 모두 표시됨)
            setConsultationFields(workAreaOptions);
            expertWorkAreasLoadedRef.current = true; // 플래그 설정하여 초기 fetch가 덮어쓰지 않도록 함

            // 첫 번째 workArea ID가 가져온 목록에 있는지 확인
            let workAreaIdToSet = firstWorkAreaId;
            if (firstWorkAreaId) {
              const workAreaExists = workAreaOptions.some(opt => opt.value === firstWorkAreaId);
              if (!workAreaExists && workAreaOptions.length > 0) {
                // 첫 번째 workArea가 목록에 없으면, 목록의 첫 번째 항목 사용
                workAreaIdToSet = workAreaOptions[0].value;
                console.log('[Consultation Apply] First workArea not in list, using first available:', workAreaIdToSet);
              }
            } else if (workAreaOptions.length > 0) {
              // workAreaId를 찾지 못했지만 목록이 있으면 첫 번째 사용
              workAreaIdToSet = workAreaOptions[0].value;
              console.log('[Consultation Apply] No workAreaId found, using first available:', workAreaIdToSet);
            }

            // 2. 해당 workArea의 전문가 목록 가져오기
            if (workAreaIdToSet) {
              console.log('[Consultation Apply] Step 2: Fetching experts for workArea:', workAreaIdToSet);
              const expertsResponse = await get<MembersResponse>(
                `${API_ENDPOINTS.MEMBERS}?page=1&limit=100&workArea=${workAreaIdToSet}`
              );

              if (expertsResponse.data?.items) {
                const expertOptions: SelectOption[] = expertsResponse.data.items
                  .filter(item => item.isExposed)
                  .map(item => ({
                    value: item.id.toString(),
                    label: item.name
                  }));
                console.log('[Consultation Apply] Step 2: Fetched experts:', expertOptions.length);

                // 선택한 전문가가 목록에 있는지 확인
                const expertExists = expertOptions.some(opt => opt.value === expertId);
                if (expertExists) {
                  setTaxAccountants(expertOptions);

                  // 3. 양쪽 모두 설정
                  console.log('[Consultation Apply] Step 3: Setting both expert and workArea');
                  setFormData(prev => ({
                    ...prev,
                    taxAccountant: expertId,
                    consultationField: workAreaIdToSet!
                  }));
                  console.log('[Consultation Apply] Step 3 complete: Both values set', {
                    taxAccountant: expertId,
                    consultationField: workAreaIdToSet
                  });
                } else {
                  console.warn('[Consultation Apply] Expert not found in workArea list, setting expert only');
                  setTaxAccountants(expertOptions);
                  setFormData(prev => ({
                    ...prev,
                    taxAccountant: expertId,
                    consultationField: ''
                  }));
                }
              } else {
                console.warn('[Consultation Apply] No experts found for workArea');
                setFormData(prev => ({
                  ...prev,
                  taxAccountant: expertId,
                  consultationField: workAreaIdToSet!
                }));
              }
            } else {
              // workArea를 찾을 수 없으면 전문가만 설정
              console.log('[Consultation Apply] No workArea to set, setting expert only');
              setFormData(prev => ({
                ...prev,
                taxAccountant: expertId,
                consultationField: ''
              }));
            }
          } else {
            console.warn('[Consultation Apply] No workAreas found for expert, setting expert only');
            setFormData(prev => ({
              ...prev,
              taxAccountant: expertId,
              consultationField: ''
            }));
          }
        } else {
          console.log('[Consultation Apply] No expert data in response');
        }
      } catch (error) {
        console.error('[Consultation Apply] Failed to fetch expert data:', error);
      }
    };

    fetchExpertAndPreFill();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, router.query.expertId]);

  const [formData, setFormData] = useState<ConsultationFormData>({
    consultationField: '',
    taxAccountant: '',
    name: '',
    phone: '',
    additionalRequest: '',
    privacyAgreement: false,
    termsAgreement: false,
  });

  const fieldDropdownRef = useRef<HTMLDivElement>(null);
  const accountantDropdownRef = useRef<HTMLDivElement>(null);
  const fieldInputRef = useRef<HTMLInputElement>(null);
  const accountantInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const expertWorkAreasLoadedRef = useRef<boolean>(false);

  // 필터링된 옵션
  const filteredFields = consultationFields.filter(field =>
    field.label.toLowerCase().includes(searchFieldQuery.toLowerCase())
  );

  const filteredAccountants = taxAccountants.filter(accountant =>
    accountant.label.toLowerCase().includes(searchAccountantQuery.toLowerCase())
  );

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (fieldDropdownRef.current && !fieldDropdownRef.current.contains(event.target as Node)) {
        setIsFieldDropdownOpen(false);
      }
      if (accountantDropdownRef.current && !accountantDropdownRef.current.contains(event.target as Node)) {
        setIsAccountantDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 세무사 목록 미리 로드 (상담 분야가 선택되지 않은 경우)
  const preloadExperts = async () => {
    // 이미 세무사 목록이 있거나 상담 분야가 선택된 경우 스킵
    if (taxAccountants.length > 0 || formData.consultationField) {
      return;
    }

    try {
      const response = await get<MembersResponse>(
        `${API_ENDPOINTS.MEMBERS}?page=1&limit=20`
      );
      if (response.data?.items) {
        const options: SelectOption[] = response.data.items
          .filter(item => item.isExposed)
          .map(item => ({
            value: item.id.toString(),
            label: item.name
          }));
        setTaxAccountants(options);
      }
    } catch (error) {
      console.error('Failed to preload experts:', error);
    }
  };

  const handleFieldChange = async (value: string) => {
    const previousTaxAccountant = formData.taxAccountant;
    console.log('[handleFieldChange] Called with value:', value, 'previousTaxAccountant:', previousTaxAccountant);

    // 분야가 선택된 경우 해당 분야의 세무사 목록 조회
    if (value) {
      try {
        const response = await get<MembersResponse>(
          `${API_ENDPOINTS.MEMBERS}?page=1&limit=100&workArea=${value}`
        );
        if (response.data?.items) {
          const options: SelectOption[] = response.data.items
            .filter(item => item.isExposed)
            .map(item => ({
              value: item.id.toString(),
              label: item.name
            }));
          console.log('[handleFieldChange] Fetched experts for workArea:', options.length, 'experts');
          setTaxAccountants(options);

          // 이전에 선택된 세무사가 새로운 목록에 있는지 확인
          const isValidAccountant = previousTaxAccountant &&
            options.some(opt => opt.value === previousTaxAccountant);

          console.log('[handleFieldChange] isValidAccountant:', isValidAccountant, 'for expertId:', previousTaxAccountant);

          // 유효하지 않으면 세무사 선택 초기화
          setFormData(prev => ({
            ...prev,
            consultationField: value,
            taxAccountant: isValidAccountant ? previousTaxAccountant : ''
          }));
        } else {
          // 세무사 목록이 비어있으면 초기화
          setTaxAccountants([]);
          setFormData(prev => ({
            ...prev,
            consultationField: value,
            taxAccountant: ''
          }));
        }
      } catch (error) {
        console.error('Failed to fetch members:', error);
        setTaxAccountants([]);
        setFormData(prev => ({
          ...prev,
          consultationField: value,
          taxAccountant: ''
        }));
      }
    } else {
      // 선택안함인 경우 세무사 목록 초기화
      setTaxAccountants([]);
      setFormData(prev => ({
        ...prev,
        consultationField: value,
        taxAccountant: ''
      }));
    }

    setSearchFieldQuery('');
    setSearchAccountantQuery('');
    setIsFieldDropdownOpen(false);
  };

  const handleAccountantChange = async (value: string) => {
    const previousConsultationField = formData.consultationField;
    console.log('[handleAccountantChange] Called with value:', value, 'previousConsultationField:', previousConsultationField);

    // 세무사가 선택된 경우 해당 세무사의 업무 분야 목록 조회
    if (value) {
      try {
        const response = await get<CategoryItem[]>(
          `${API_ENDPOINTS.BUSINESS_AREAS_CATEGORIES}?memberId=${value}`
        );
        if (response.data && response.data.length > 0) {
          const options: SelectOption[] = response.data
            .filter(item => item.isExposed)
            .map(item => ({
              value: item.id.toString(),
              label: item.name
            }));
          console.log('[handleAccountantChange] Fetched workAreas for expert:', options.length, 'workAreas');
          setConsultationFields(options);

          // 이전에 선택된 분야가 새로운 목록에 있는지 확인
          const isValidField = previousConsultationField &&
            options.some(opt => opt.value === previousConsultationField);

          console.log('[handleAccountantChange] isValidField:', isValidField, 'for workAreaId:', previousConsultationField);

          // 유효하지 않으면 분야 선택 초기화
          setFormData(prev => ({
            ...prev,
            taxAccountant: value,
            consultationField: isValidField ? previousConsultationField : ''
          }));
        } else {
          // 분야 목록이 비어있으면 초기화
          setConsultationFields([]);
          setFormData(prev => ({
            ...prev,
            taxAccountant: value,
            consultationField: ''
          }));
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error);
        setConsultationFields([]);
        setFormData(prev => ({
          ...prev,
          taxAccountant: value,
          consultationField: ''
        }));
      }
    } else {
      // 선택안함인 경우 분야 목록을 전체 목록으로 복원
      try {
        const response = await get<CategoryItem[]>(API_ENDPOINTS.BUSINESS_AREAS_CATEGORIES);
        if (response.data) {
          const options: SelectOption[] = response.data
            .filter(item => item.isExposed)
            .map(item => ({
              value: item.id.toString(),
              label: item.name
            }));
          setConsultationFields(options);
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      }
      setFormData(prev => ({ ...prev, taxAccountant: value }));
    }

    setSearchAccountantQuery('');
    setIsAccountantDropdownOpen(false);
  };

  const handleInputChange = (field: keyof ConsultationFormData) => (value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // 필드 값 변경 시 해당 필드의 API 오류 초기화
    if (fieldErrors[field]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleCheckboxChange = (field: 'privacyAgreement' | 'termsAgreement') => (checked: boolean) => {
    setFormData(prev => ({ ...prev, [field]: checked }));
  };

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const getFieldError = (field: keyof ConsultationFormData): string | null => {
    // API에서 반환한 필드별 오류 우선 표시
    if (fieldErrors[field]) return fieldErrors[field];

    const shouldShow = touched[field] || isSubmitAttempted;
    if (!shouldShow) return null;

    switch (field) {
      case 'consultationField':
        return !formData.consultationField ? '상담 분야를 선택해주세요' : null;
      case 'taxAccountant':
        return !formData.taxAccountant ? '담당 세무사를 선택해주세요' : null;
      case 'name':
        return !formData.name ? '이름을 입력해주세요' : null;
      case 'phone':
        return !formData.phone ? '휴대폰 번호를 입력해주세요' : null;
      case 'additionalRequest':
        return !formData.additionalRequest ? '추가 요청사항을 입력해주세요' : null;
      case 'privacyAgreement':
        return !formData.privacyAgreement ? '개인정보 처리 방침에 동의해주세요' : null;
      case 'termsAgreement':
        return !formData.termsAgreement ? '이용약관에 동의해주세요' : null;
      default:
        return null;
    }
  };

  const parseApiError = (errorMessage: string): Record<string, string> => {
    const errors: Record<string, string> = {};

    // 이름 관련 오류
    if (errorMessage.includes('이름')) {
      errors.name = errorMessage;
    }
    // 휴대폰 번호 관련 오류
    else if (errorMessage.includes('휴대폰') || errorMessage.includes('전화')) {
      errors.phone = errorMessage;
    }
    // 상담 분야 관련 오류
    else if (errorMessage.includes('상담 분야') || errorMessage.includes('분야')) {
      errors.consultationField = errorMessage;
    }
    // 세무사 관련 오류
    else if (errorMessage.includes('세무사')) {
      errors.taxAccountant = errorMessage;
    }
    // 내용 관련 오류
    else if (errorMessage.includes('내용') || errorMessage.includes('요청사항')) {
      errors.additionalRequest = errorMessage;
    }

    return errors;
  };

  const isFormValid = () => {
    return (
      formData.consultationField &&
      formData.taxAccountant &&
      formData.name &&
      formData.phone &&
      formData.additionalRequest &&
      formData.privacyAgreement &&
      formData.termsAgreement
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitAttempted(true);
    if (!isFormValid() || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);
    setFieldErrors({});

    try {
      // 폼 데이터를 API 요청 형식으로 변환
      const selectedField = consultationFields.find(f => f.value === formData.consultationField);
      const selectedAccountant = taxAccountants.find(a => a.value === formData.taxAccountant);

      const apiRequestBody: ConsultationApiRequest = {
        name: formData.name,
        phoneNumber: formData.phone.replace(/-/g, ''), // 하이픈 제거
        consultingField: selectedField?.label || formData.consultationField,
        assignedTaxAccountant: selectedAccountant?.label || formData.taxAccountant,
        content: formData.additionalRequest,
        privacyAgreed: formData.privacyAgreement,
        termsAgreed: formData.termsAgreement,
        memberFlag: isLoggedIn ? 'MEMBER' : 'NON_MEMBER', // 로그인 상태에 따라 설정
      };

      // post 함수 사용 (인증 토큰 자동 포함)
      const response = await post(API_ENDPOINTS.CONSULTATIONS, apiRequestBody);

      if (response.error) {
        throw new Error(response.error || '상담 신청에 실패했습니다. 다시 시도해주세요.');
      }

      setIsSuccessModalOpen(true);
      console.log("GA EVENT FIRED");

      if (window.gtag) {
        window.gtag("event", "consultation_submit", {
          event_category: "lead",
          event_label: "consultation_form",
        });
      }

    } catch (error) {
      console.error('Consultation submission error:', error);
      const errorMessage = error instanceof Error ? error.message : '상담 신청에 실패했습니다. 다시 시도해주세요.';

      // API 오류를 필드별로 분류
      const parsedErrors = parseApiError(errorMessage);
      if (Object.keys(parsedErrors).length > 0) {
        setFieldErrors(parsedErrors);
      } else {
        // 분류되지 않은 오류는 일반 오류로 표시
        setSubmitError(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSuccessModalClose = () => {
    setIsSuccessModalOpen(false);
    router.push('/');
  };

  const selectedFieldLabel = consultationFields.find(f => f.value === formData.consultationField)?.label || '상담 분야를 선택해주세요';
  const selectedAccountantLabel = taxAccountants.find(a => a.value === formData.taxAccountant)?.label || '담당 세무사를 선택해주세요';

  return (
    <div className={styles.consultationPage}>
      <Header
        variant="white"
        onMenuClick={() => setIsMenuOpen(true)}
        onLogoClick={() => router.push('/')}
      />
      <Menu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
      <div className={styles.headerImage}>
        <p>CONTACT</p>
        <h1>세무법인 함께 상담 신청</h1>
      </div>

      <div className={styles.pageContent}>


        {/* Form Section */}
        <div className={styles.formSection}>
          <div className={styles.formContainer}>


            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.formFields}>
                {/* 상담 분야 & 담당 세무사 */}
                <div className={styles.formRow}>
                  <div className={styles.formField} ref={fieldDropdownRef}>
                    <label className={styles.fieldLabel}>
                      상담 분야
                      <span className={styles.required}>*</span>
                    </label>
                    <div className={styles.selectWrapper}>
                      <div
                        className={`${styles.selectTrigger} ${isFieldDropdownOpen ? styles.selectTriggerOpen : ''}`}
                        onClick={(e) => {
                          if ((e.target as HTMLElement).closest(`.${styles.clearButton}`)) return;
                          setIsFieldDropdownOpen(!isFieldDropdownOpen);
                        }}
                      >
                        <input
                          ref={fieldInputRef}
                          type="text"
                          className={styles.selectInput}
                          value={searchFieldQuery || (formData.consultationField ? selectedFieldLabel : '')}
                          onChange={(e) => {
                            const newValue = e.target.value;
                            setSearchFieldQuery(newValue);
                            if (formData.consultationField) {
                              setFormData(prev => ({ ...prev, consultationField: '' }));
                            }
                            setIsFieldDropdownOpen(true);
                          }}
                          placeholder="상담 분야를 선택해주세요"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsFieldDropdownOpen(true);
                          }}
                          onFocus={(e) => {
                            setFocusedField('consultationField');
                            setIsFieldDropdownOpen(true);
                            if (formData.consultationField && !searchFieldQuery) {
                              setSearchFieldQuery(selectedFieldLabel);
                              e.target.setSelectionRange(0, e.target.value.length);
                            }
                          }}
                          onBlur={() => {
                            setFocusedField(null);
                          }}
                        />
                        {focusedField === 'consultationField' && (formData.consultationField || searchFieldQuery) && (
                          <button
                            type="button"
                            className={styles.clearButton}
                            onMouseDown={(e) => {
                              e.preventDefault(); // Prevent input blur
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleFieldChange('');
                              // Refocus the input after clearing
                              setTimeout(() => {
                                fieldInputRef.current?.focus();
                              }, 0);
                            }}
                          >
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                              <path
                                d="M15 5L5 15M5 5L15 15"
                                stroke="#fff"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                              />
                            </svg>
                          </button>
                        )}
                        {focusedField !== 'consultationField' && (
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 20 20"
                            fill="none"
                            className={`${styles.selectArrow} ${isFieldDropdownOpen ? styles.selectArrowOpen : ''}`}
                          >
                            <path
                              d="M5 7.5L10 12.5L15 7.5"
                              stroke="#555"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                            />
                          </svg>
                        )}
                      </div>
                      {isFieldDropdownOpen && (
                        <div className={styles.selectDropdown}>
                          <div className={styles.selectOptions}>
                            {filteredFields.map((field) => (
                              <div
                                key={field.value}
                                className={`${styles.selectOption} ${formData.consultationField === field.value ? styles.selectOptionActive : ''}`}
                                onClick={() => handleFieldChange(field.value)}
                              >
                                {field.label}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    {getFieldError('consultationField') && (
                      <p className={styles.fieldError}>{getFieldError('consultationField')}</p>
                    )}
                  </div>

                  <div className={styles.formField} ref={accountantDropdownRef}>
                    <label className={styles.fieldLabel}>
                      담당 세무사
                      <span className={styles.required}>*</span>
                    </label>
                    <div className={styles.selectWrapper}>
                      <div
                        className={`${styles.selectTrigger} ${isAccountantDropdownOpen ? styles.selectTriggerOpen : ''}`}
                        onClick={(e) => {
                          if ((e.target as HTMLElement).closest(`.${styles.clearButton}`)) return;
                          setIsAccountantDropdownOpen(!isAccountantDropdownOpen);
                          // 상담 분야가 선택되지 않은 경우 세무사 목록 미리 로드
                          if (!formData.consultationField) {
                            preloadExperts();
                          }
                        }}
                      >
                        <input
                          ref={accountantInputRef}
                          type="text"
                          className={styles.selectInput}
                          value={searchAccountantQuery || (formData.taxAccountant ? selectedAccountantLabel : '')}
                          onChange={(e) => {
                            const newValue = e.target.value;
                            setSearchAccountantQuery(newValue);
                            if (formData.taxAccountant) {
                              setFormData(prev => ({ ...prev, taxAccountant: '' }));
                            }
                            setIsAccountantDropdownOpen(true);
                          }}
                          placeholder="담당 세무사를 선택해주세요"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsAccountantDropdownOpen(true);
                            // 상담 분야가 선택되지 않은 경우 세무사 목록 미리 로드
                            if (!formData.consultationField) {
                              preloadExperts();
                            }
                          }}
                          onFocus={(e) => {
                            setFocusedField('taxAccountant');
                            setIsAccountantDropdownOpen(true);
                            // 상담 분야가 선택되지 않은 경우 세무사 목록 미리 로드
                            if (!formData.consultationField) {
                              preloadExperts();
                            }
                            if (formData.taxAccountant && !searchAccountantQuery) {
                              setSearchAccountantQuery(selectedAccountantLabel);
                              e.target.setSelectionRange(0, e.target.value.length);
                            }
                          }}
                          onBlur={() => {
                            setFocusedField(null);
                          }}
                        />
                        {focusedField === 'taxAccountant' && (formData.taxAccountant || searchAccountantQuery) && (
                          <button
                            type="button"
                            className={styles.clearButton}
                            onMouseDown={(e) => {
                              e.preventDefault(); // Prevent input blur
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAccountantChange('');
                              // Refocus the input after clearing
                              setTimeout(() => {
                                accountantInputRef.current?.focus();
                              }, 0);
                            }}
                          >
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                              <path
                                d="M15 5L5 15M5 5L15 15"
                                stroke="#fff"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                              />
                            </svg>
                          </button>
                        )}
                        {focusedField !== 'taxAccountant' && (
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 20 20"
                            fill="none"
                            className={`${styles.selectArrow} ${isAccountantDropdownOpen ? styles.selectArrowOpen : ''}`}
                          >
                            <path
                              d="M5 7.5L10 12.5L15 7.5"
                              stroke="#555"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                            />
                          </svg>
                        )}
                      </div>
                      {isAccountantDropdownOpen && (
                        <div className={styles.selectDropdown}>
                          <div className={styles.selectOptions}>
                            {filteredAccountants.map((accountant) => (
                              <div
                                key={accountant.value}
                                className={`${styles.selectOption} ${formData.taxAccountant === accountant.value ? styles.selectOptionActive : ''}`}
                                onClick={() => handleAccountantChange(accountant.value)}
                              >
                                {accountant.label}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    {getFieldError('taxAccountant') && (
                      <p className={styles.fieldError}>{getFieldError('taxAccountant')}</p>
                    )}
                  </div>
                </div>

                {/* 이름 & 휴대폰 번호 */}
                <div className={styles.formRow}>
                  <div className={styles.formField}>
                    <label className={styles.fieldLabel}>
                      이름
                      <span className={styles.required}>*</span>
                    </label>
                    <div className={styles.inputWrapper}>
                      <input
                        ref={nameInputRef}
                        type="text"
                        className={`${styles.textInput} ${getFieldError('name') ? styles.textInputError : ''}`}
                        placeholder="이름을 입력해주세요"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name')(e.target.value)}
                        onFocus={() => setFocusedField('name')}
                        onBlur={() => {
                          handleBlur('name');
                          setFocusedField(null);
                        }}
                      />
                      {focusedField === 'name' && formData.name && (
                        <button
                          type="button"
                          className={styles.clearButton}
                          onMouseDown={(e) => {
                            e.preventDefault(); // Prevent input blur
                          }}
                          onClick={() => {
                            handleInputChange('name')('');
                            // Refocus the input after clearing
                            setTimeout(() => {
                              nameInputRef.current?.focus();
                            }, 0);
                          }}
                        >
                          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                            <path
                              d="M15 5L5 15M5 5L15 15"
                              stroke="#fff"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                            />
                          </svg>
                        </button>
                      )}
                    </div>
                    {getFieldError('name') && (
                      <p className={styles.fieldError}>{getFieldError('name')}</p>
                    )}
                  </div>

                  <div className={styles.formField}>
                    <label className={styles.fieldLabel}>
                      휴대폰 번호
                      <span className={styles.required}>*</span>
                    </label>
                    <div className={styles.inputWrapper}>
                      <input
                        ref={phoneInputRef}
                        type="tel"
                        className={`${styles.textInput} ${getFieldError('phone') ? styles.textInputError : ''}`}
                        placeholder="휴대폰 번호를 입력해주세요"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone')(e.target.value)}
                        onFocus={() => setFocusedField('phone')}
                        onBlur={() => {
                          handleBlur('phone');
                          setFocusedField(null);
                        }}
                      />
                      {focusedField === 'phone' && formData.phone && (
                        <button
                          type="button"
                          className={styles.clearButton}
                          onMouseDown={(e) => {
                            e.preventDefault(); // Prevent input blur
                          }}
                          onClick={() => {
                            handleInputChange('phone')('');
                            // Refocus the input after clearing
                            setTimeout(() => {
                              phoneInputRef.current?.focus();
                            }, 0);
                          }}
                        >
                          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                            <path
                              d="M15 5L5 15M5 5L15 15"
                              stroke="#fff"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                            />
                          </svg>
                        </button>
                      )}
                    </div>
                    {getFieldError('phone') && (
                      <p className={styles.fieldError}>{getFieldError('phone')}</p>
                    )}
                  </div>
                </div>

                {/* 추가 요청사항 */}
                <div className={styles.formField}>
                  <label className={styles.fieldLabel}>
                    추가 요청사항
                    <span className={styles.required}>*</span>
                  </label>
                  <div className={styles.textareaWrapper}>
                    <textarea
                      className={`${styles.textarea} ${getFieldError('additionalRequest') ? styles.textareaError : ''}`}
                      placeholder="상담 내용을 입력해주세요"
                      value={formData.additionalRequest}
                      onChange={(e) => handleInputChange('additionalRequest')(e.target.value)}
                      onBlur={() => handleBlur('additionalRequest')}
                      rows={8}
                    />
                  </div>
                  {getFieldError('additionalRequest') && (
                    <p className={styles.fieldError}>{getFieldError('additionalRequest')}</p>
                  )}
                </div>

                {/* 동의 체크박스 */}
                <div className={styles.agreements}>
                  <div className={styles.agreementItemWrapper}>
                    <div className={styles.agreementItem}>
                      <Checkbox
                        variant="square"
                        checked={formData.privacyAgreement}
                        onChange={handleCheckboxChange('privacyAgreement')}
                        label="[필수] 개인정보 처리 방침 이용 동의"
                      />
                      <button type="button" className={styles.viewLink}>
                        보기
                      </button>
                    </div>
                    {getFieldError('privacyAgreement') && (
                      <p className={styles.fieldError}>{getFieldError('privacyAgreement')}</p>
                    )}
                  </div>
                  <div className={styles.agreementItemWrapper}>
                    <div className={styles.agreementItem}>
                      <Checkbox
                        variant="square"
                        checked={formData.termsAgreement}
                        onChange={handleCheckboxChange('termsAgreement')}
                        label="[필수] OO OOOOO 이용 동의"
                      />
                      <button type="button" className={styles.viewLink}>
                        보기
                      </button>
                    </div>
                    {getFieldError('termsAgreement') && (
                      <p className={styles.fieldError}>{getFieldError('termsAgreement')}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className={styles.submitButtonWrapper}>
                {submitError && (
                  <p className={styles.errorMessage}>{submitError}</p>
                )}
                <Button
                  type="primary"
                  size="large"
                  disabled={!isFormValid() || isSubmitting}
                  htmlType="submit"
                  className={styles.submitButton}
                >
                  {isSubmitting ? '신청 중...' : '신청하기'}
                </Button>
              </div>
            </form>
          </div>
        </div>

        <Footer />
      </div>

      {/* Success Modal */}
      {isSuccessModalOpen && (
        <div className={styles.modalOverlay} onClick={handleSuccessModalClose}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>

            <div className={styles.modalBody}>
              <div className={styles.successIcon}>
                <svg width="35" height="35" viewBox="0 0 35 35" fill="none">
                  <path
                    d="M2.5 17.5L12.5 27.5L32.5 7.5"
                    stroke="#00A89E"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div className={styles.successMessage}>
                <h2 className={styles.successTitle}>
                  상담 신청이<br />
                  정상적으로 접수되었습니다.
                </h2>
                <p className={styles.successDescription}>
                  접수 내용을 확인한 후, 순차적으로 연락드리겠습니다.<br />
                  신뢰할 수 있는 파트너, 세무법인 함께를 찾아주셔서 감사합니다.
                </p>
              </div>
              <Button
                type="primary"
                size="large"
                onClick={handleSuccessModalClose}
                className={styles.modalButton}
              >
                확인
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConsultationApplyPage;

