/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Advertisement {
  id: string;
  position: string;
  type: 'image' | 'video' | 'js';
  title: string;
  materialUrl: string;
  clickUrl?: string;
  width?: number;
  height?: number;
  startDate: number;
  endDate: number;
  enabled: boolean;
  priority: number;
}

interface AdDisplayProps {
  position: string;
  className?: string;
  showCloseButton?: boolean;
  onClose?: () => void;
}

const AdDisplay: React.FC<AdDisplayProps> = ({
  position,
  className = '',
  showCloseButton = false,
  onClose,
}) => {
  const [advertisements, setAdvertisements] = useState<Advertisement[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [isClosed, setIsClosed] = useState(false);

  useEffect(() => {
    const fetchAds = async () => {
      try {
        const response = await fetch(`/api/advertisements?position=${position}`);
        console.log(`获取广告 position=${position}:`, response.status);
        if (response.ok) {
          const data = await response.json();
          console.log(`广告数据 position=${position}:`, data);
          setAdvertisements(data.advertisements || []);
        }
      } catch (error) {
        console.error(`获取广告失败 position=${position}:`, error);
      } finally {
        setLoading(false);
      }
    };

    fetchAds();
  }, [position]);

  // 如果有多个广告，自动轮播
  useEffect(() => {
    if (advertisements.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentAdIndex((prev) => (prev + 1) % advertisements.length);
    }, 5000); // 每5秒切换一次

    return () => clearInterval(timer);
  }, [advertisements.length]);

  const handleClose = () => {
    setIsClosed(true);
    onClose?.();
  };

  if (loading || isClosed || advertisements.length === 0) {
    return null;
  }

  const currentAd = advertisements[currentAdIndex];

  const handleAdClick = () => {
    if (currentAd.clickUrl) {
      window.open(currentAd.clickUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const renderAdContent = () => {
    switch (currentAd.type) {
      case 'image':
        return (
          <img
            src={currentAd.materialUrl}
            alt={currentAd.title}
            style={{
              width: currentAd.width ? `${currentAd.width}px` : '100%',
              height: currentAd.height ? `${currentAd.height}px` : 'auto',
              maxWidth: '100%',
            }}
            className="object-contain"
            onClick={handleAdClick}
          />
        );

      case 'video':
        return (
          <video
            src={currentAd.materialUrl}
            controls
            autoPlay
            muted
            loop
            style={{
              width: currentAd.width ? `${currentAd.width}px` : '100%',
              height: currentAd.height ? `${currentAd.height}px` : 'auto',
              maxWidth: '100%',
            }}
            className="object-contain"
            onClick={handleAdClick}
          />
        );

      case 'js':
        return (
          <div
            dangerouslySetInnerHTML={{ __html: currentAd.materialUrl }}
            onClick={handleAdClick}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* 广告内容 */}
      <div
        className={`${currentAd.clickUrl ? 'cursor-pointer' : ''}`}
        title={currentAd.title}
      >
        {renderAdContent()}
      </div>

      {/* 关闭按钮 */}
      {showCloseButton && (
        <button
          onClick={handleClose}
          className="absolute top-2 right-2 p-1 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full transition-all z-10"
          title="关闭广告"
        >
          <X size={16} />
        </button>
      )}

      {/* 轮播指示器 */}
      {advertisements.length > 1 && (
        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-1">
          {advertisements.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentAdIndex(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentAdIndex
                  ? 'bg-white w-4'
                  : 'bg-white bg-opacity-50'
              }`}
              title={`广告 ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* 广告标识 */}
      <div className="absolute top-2 left-2 px-2 py-0.5 bg-black bg-opacity-50 text-white text-xs rounded">
        广告
      </div>
    </div>
  );
};

export default AdDisplay;
