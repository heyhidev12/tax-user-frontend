import React, { useState, useEffect, useRef } from 'react';
import styles from './style.module.scss';
import ViewMore from '../../common/ViewMore';
import { get } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';

interface ClientLogo {
  id: number;
  url: string;
}

interface KeyCustomer {
  id: number;
  logo: ClientLogo;
  displayOrder: number;
  isMainExposed: boolean;
  isExposed: boolean;
}

interface KeyCustomersApiResponse {
  items: KeyCustomer[];
  total: number;
  page: number;
  limit: number;
}

const Clients: React.FC = () => {
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const [isPaused, setIsPaused] = useState(false);
  const [clients, setClients] = useState<KeyCustomer[]>([]);
  const row1Ref = useRef<HTMLDivElement>(null);
  const row2Ref = useRef<HTMLDivElement>(null);
  const [row1Offset, setRow1Offset] = useState(0);
  const [row2Offset, setRow2Offset] = useState(0);

  useEffect(() => {
    const fetchKeyCustomers = async () => {
      try {
        const response = await get<KeyCustomersApiResponse>(
          `${API_ENDPOINTS.KEY_CUSTOMERS}?page=1&limit=20`
        );

        if (response.data && response.data.items && response.data.items.length > 0) {
          // Filter only items where isMainExposed === true
          const exposedCustomers = response.data.items.filter(
            (item) => item.isMainExposed === true
          );
          setClients(exposedCustomers);
        }
      } catch (error) {
        console.error('Failed to fetch key customers:', error);
      }
    };

    fetchKeyCustomers();
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
    <section className={styles['clients-section']}>
      <div className={styles['clients-section__background']}>
        <span className={styles['clients-section__bg-text']}>Together</span>
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
                <img 
                  src={client.logo?.url || ""} 
                  alt={`Client ${client.id}`} 
                  className={styles['client-logo']}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "https://via.placeholder.com/180x50/e8e8e8/999999?text=Logo";
                  }}
                />
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
                <img 
                  src={client.logo?.url || ""} 
                  alt={`Client ${client.id}`} 
                  className={styles['client-logo']}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "https://via.placeholder.com/180x50/e8e8e8/999999?text=Logo";
                  }}
                />
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
};

export default Clients;
