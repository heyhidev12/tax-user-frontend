"use client";

import React, { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/dist/ScrollTrigger';
import styles from './style.module.scss';
import ViewMore from '../../common/ViewMore';
import type { KeyCustomer } from '../index';
import { API_BASE_URL } from '@/config/api';

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const FALLBACK_LOGO = '/images/logo/logo_main.png';

function getClientLogoUrl(client: KeyCustomer): string {
  const raw = client.logo?.url?.trim() || '';
  if (!raw) return FALLBACK_LOGO;
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  if (raw.startsWith('/') && API_BASE_URL) return `${API_BASE_URL.replace(/\/$/, '')}${raw}`;
  return FALLBACK_LOGO;
}

interface ClientsProps {
  clients: KeyCustomer[];
}

const Clients: React.FC<ClientsProps> = React.memo(({ clients }) => {
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const [isPaused, setIsPaused] = useState(false);
  const row1Ref = useRef<HTMLDivElement>(null);
  const row2Ref = useRef<HTMLDivElement>(null);
  const [row1Offset, setRow1Offset] = useState(0);
  const [row2Offset, setRow2Offset] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);
  const togetherTextRef = useRef<HTMLSpanElement>(null);

  // GSAP Animation - Late start (85%), y animation with stagger
  useEffect(() => {
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
    if (!sectionRef.current || clients.length === 0) return;
  
    const ctx = gsap.context(() => {
  
      const logos = sectionRef.current!.querySelectorAll(
        `.${styles["client-logo"]}`
      );
  
      if (!logos.length) return;
  
      gsap.fromTo(
        logos,
        {
          opacity: 0,
          y: 60,
        },
        {
          opacity: 1,
          y: 0,
          stagger: 0.08,
          ease: "power2.out",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: isMobile ? "top 90%" : "top 85%", // KECH BOSHLANADI
            end: "top 55%",
            scrub: !isMobile, // desktop scroll sync
          },
        }
      );
  
    }, sectionRef);
  
    return () => ctx.revert();
  }, [clients.length]);
  

  // GSAP Animation for "Together" text - Horizontal scroll synchronized
  useEffect(() => {
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  
    if (!sectionRef.current || !togetherTextRef.current) return;
  
    const ctx = gsap.context(() => {
      const el = togetherTextRef.current!;
  
      // MOBILE: simple fade only
      if (isMobile) {
        gsap.fromTo(
          el,
          { opacity: 0, y: 20 },
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: "power2.out",
            scrollTrigger: {
              trigger: sectionRef.current,
              start: "top 85%",
            },
          }
        );
        return;
      }
  
      // DESKTOP: LEFT → FINAL POSITION (SCROLL DRAG STYLE)
      gsap.fromTo(
        el,
        {
          x: -800,
          opacity: 0,
        },
        {
          x: 0,
          opacity: 1,
          ease: "none",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 85%",
            end: "+=1000",
            scrub: 1.5,
          },
        }
      );
      
    }, sectionRef);
  
    return () => ctx.revert();
  }, []);
  
  
  
  

  // Split clients into two rows (evenly distributed)
  const clientsRow1 = clients.slice(0, Math.ceil(clients.length / 2));
  const clientsRow2 = clients.slice(Math.ceil(clients.length / 2));

  // Get current transform position
  const getCurrentOffset = (element: HTMLDivElement | null): number => {
    if (!element) return 0;
    const style = window.getComputedStyle(element);
    const matrix = new DOMMatrix(style.transform);
    return matrix.m41; // translateX value
  };

  // Animation cycle
  useEffect(() => {
    const cycleDuration = 15000; // 15 seconds for one scroll cycle
    const pauseDuration = 2500; // 2.5 seconds pause

    const interval = setInterval(() => {
      // Capture current positions before pausing
      const currentRow1Offset = getCurrentOffset(row1Ref.current);
      const currentRow2Offset = getCurrentOffset(row2Ref.current);

      setRow1Offset(currentRow1Offset);
      setRow2Offset(currentRow2Offset);
      setIsPaused(true);

      // After pause, reverse direction and continue from current position
      setTimeout(() => {
        setDirection(prev => prev === 'forward' ? 'backward' : 'forward');
        setIsPaused(false);
      }, pauseDuration);
    }, cycleDuration);

    return () => clearInterval(interval);
  }, []);

  // Duplicate items for seamless loop
  const duplicatedRow1 = [...clientsRow1, ...clientsRow1, ...clientsRow1, ...clientsRow1];
  const duplicatedRow2 = [...clientsRow2, ...clientsRow2, ...clientsRow2, ...clientsRow2];

  const getRow1Style = (): React.CSSProperties => {
    if (isPaused) {
      return { transform: `translateX(${row1Offset}px)` };
    }
    return {};
  };

  const getRow2Style = (): React.CSSProperties => {
    if (isPaused) {
      return { transform: `translateX(${row2Offset}px)` };
    }
    return {};
  };

  return (
    <section ref={sectionRef} className={styles['clients-section']}>
      <div className={styles['clients-section__background']}>
        <span ref={togetherTextRef} className={styles['clients-section__bg-text']}>Together</span>
      </div>

      <div className={`${styles['clients-section__header']} container`}>
        <div className={styles['clients-section__number']}>04</div>
        <div className={styles['clients-section__title-wrapper']}>
          <span className={styles['clients-section__dot']}></span>
          <span className={styles['clients-section__subtitle']}>주요 고객</span>
          <h2 className={styles['clients-section__title']}>CLIENTS</h2>
        </div>
        <div className={styles['clients-section__view']}>
        <ViewMore target="clients-customers" />
      </div>
      </div>

      <div className={styles['clients-marquee']}>
        {/* Row 1 */}
        <div className={styles['clients-marquee__row']}>
          <div
            ref={row1Ref}
            className={`${styles['clients-marquee__track']} ${isPaused ? styles.paused : ''} ${direction === 'forward' ? styles['scroll-left'] : styles['scroll-right']}`}
            style={getRow1Style()}
          >
            {duplicatedRow1.map((client, index) => (
              <div key={`row1-${client.id}-${index}`} className={styles['clients-marquee__item']}>
                {client.websiteUrl ? (
                  <a 
                    href={client.websiteUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    <img 
                      src={getClientLogoUrl(client)} 
                      alt={`Client ${client.id}`} 
                      className={styles['client-logo']}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = FALLBACK_LOGO;
                      }}
                    />
                  </a>
                ) : (
                  <img 
                    src={getClientLogoUrl(client)} 
                    alt={`Client ${client.id}`} 
                    className={styles['client-logo']}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = FALLBACK_LOGO;
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Row 2 */}
        <div className={styles['clients-marquee__row']}>
          <div
            ref={row2Ref}
            className={`${styles['clients-marquee__track']} ${isPaused ? styles.paused : ''} ${direction === 'forward' ? styles['scroll-right'] : styles['scroll-left']}`}
            style={getRow2Style()}
          >
            {duplicatedRow2.map((client, index) => (
              <div key={`row2-${client.id}-${index}`} className={styles['clients-marquee__item']}>
                {client.websiteUrl ? (
                  <a 
                    href={client.websiteUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    <img 
                      src={getClientLogoUrl(client)} 
                      alt={`Client ${client.id}`} 
                      className={styles['client-logo']}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = FALLBACK_LOGO;
                      }}
                    />
                  </a>
                ) : (
                  <img 
                    src={getClientLogoUrl(client)} 
                    alt={`Client ${client.id}`} 
                    className={styles['client-logo']}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = FALLBACK_LOGO;
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={styles['clients-section__footer']}>
        <ViewMore target="clients-customers" />
      </div>
    </section>
  );
});

export default Clients;
