declare global {
  interface Window {
    qq: any;
  }
}

let loadPromise: Promise<void> | null = null;

export function loadTencentMap(key: string): Promise<void> {
  if (window.qq && window.qq.maps) {
    return Promise.resolve();
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = new Promise((resolve, reject) => {
    // Define global callback
    (window as any).initQQMap = () => {
      resolve();
    };

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = `https://map.qq.com/api/js?v=2.exp&key=${key}&callback=initQQMap`;
    script.async = true;
    script.onerror = (err) => {
      loadPromise = null;
      reject(err);
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}
