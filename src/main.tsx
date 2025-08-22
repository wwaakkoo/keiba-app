import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// PWA Service Worker登録（vite-plugin-pwa使用）
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('PWA: Service Worker登録成功:', registration);
        
        // 更新チェック
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('PWA: 新しいコンテンツが利用可能です');
                // カスタムイベントを発火して更新通知コンポーネントに通知
                window.dispatchEvent(new CustomEvent('sw-update-available'));
              }
            });
          }
        });
      })
      .catch((error) => {
        console.error('PWA: Service Worker登録失敗:', error);
      });
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)