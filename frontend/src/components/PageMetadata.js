import { useEffect } from 'react';

function upsertMeta(selector, attributes) {
  let element = document.head.querySelector(selector);

  if (!element) {
    element = document.createElement('meta');
    document.head.appendChild(element);
  }

  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });
}

function PageMetadata({ canonicalPath = '/', description, noIndex = false, structuredData, title }) {
  useEffect(() => {
    const siteUrl = (process.env.REACT_APP_SITE_URL || window.location.origin).replace(/\/$/, '');
    const canonicalUrl = `${siteUrl}${canonicalPath}`;

    document.title = title;

    upsertMeta('meta[name="description"]', { name: 'description', content: description });
    upsertMeta('meta[name="robots"]', {
      name: 'robots',
      content: noIndex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large',
    });
    upsertMeta('meta[property="og:title"]', { property: 'og:title', content: title });
    upsertMeta('meta[property="og:description"]', { property: 'og:description', content: description });
    upsertMeta('meta[property="og:url"]', { property: 'og:url', content: canonicalUrl });
    upsertMeta('meta[property="og:type"]', { property: 'og:type', content: 'website' });

    let canonical = document.head.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', canonicalUrl);

    document.getElementById('page-structured-data')?.remove();
    if (structuredData) {
      const script = document.createElement('script');
      script.id = 'page-structured-data';
      script.type = 'application/ld+json';
      script.text = JSON.stringify(structuredData(siteUrl, canonicalUrl));
      document.head.appendChild(script);
    }

    return () => document.getElementById('page-structured-data')?.remove();
  }, [canonicalPath, description, noIndex, structuredData, title]);

  return null;
}

export default PageMetadata;
