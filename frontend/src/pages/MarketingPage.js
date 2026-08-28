import { Link } from 'react-router-dom';
import PageMetadata from '../components/PageMetadata';
import styles from './MarketingPage.module.css';

const structuredData = (siteUrl, canonicalUrl) => ({
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${siteUrl}/#organization`,
      name: 'OCR Finance',
      url: siteUrl,
      email: 'pointsmart909@gmail.com',
    },
    {
      '@type': 'SoftwareApplication',
      '@id': `${canonicalUrl}#software`,
      name: 'OCR Finance',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      url: canonicalUrl,
      inLanguage: 'bg',
      description: 'OCR софтуер за автоматично разпознаване, проверка и обработка на фактури и касови бележки.',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'EUR',
      },
      publisher: {
        '@id': `${siteUrl}/#organization`,
      },
    },
    {
      '@type': 'BreadcrumbList',
      '@id': `${canonicalUrl}#breadcrumb`,
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'OCR Finance',
          item: siteUrl,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'OCR за фактури и касови бележки',
          item: canonicalUrl,
        },
      ],
    },
  ],
});

const benefits = [
  ['Автоматично извличане', 'Разпознаване на доставчик, дата, номер, суми, ДДС, валута и позиции от документа.'],
  ['Контрол преди одобрение', 'OCR резултатът остава чернова, докато човек не го прегледа и потвърди.'],
  ['Счетоводни проверки', 'Системата предупреждава за липсващи полета, несъответствия в сумите и възможни дубликати.'],
  ['Експорт и отчети', 'Одобрените документи могат да се изтеглят като Excel или PDF и участват в месечните справки.'],
];

function MarketingPage() {
  return (
    <div className={styles.page}>
      <PageMetadata
        canonicalPath="/ocr-fakturi-kasovi-belezhki"
        description="OCR за фактури и касови бележки: автоматично извличане на доставчик, дата, суми, ДДС и позиции, с човешки преглед и счетоводни проверки."
        structuredData={structuredData}
        title="OCR за фактури и касови бележки | OCR Finance"
      />

      <header className={styles.header}>
        <Link className={styles.brand} to="/ocr-fakturi-kasovi-belezhki" aria-label="OCR Finance">
          <span className="brand-mark">O</span>
          <span>
            <strong>OCR Finance</strong>
            <small>Invoice intelligence</small>
          </span>
        </Link>
        <nav aria-label="Основна навигация">
          <a href="#how-it-works">Как работи</a>
          <a href="#features">Възможности</a>
          <a href="#faq">Въпроси</a>
          <Link className={styles.loginLink} to="/login">Вход</Link>
        </nav>
      </header>

      <main>
        <section className={styles.hero}>
          <div className={styles.heroText}>
            <p className={styles.eyebrow}>OCR за българското счетоводство</p>
            <h1>OCR за фактури и касови бележки</h1>
            <p>
              OCR Finance превръща PDF файлове и снимки в структурирани счетоводни данни.
              Извличайте ключовите полета, проверявайте предупрежденията и одобрявайте
              само данните, на които имате доверие.
            </p>
            <div className={styles.actions}>
              <Link className={styles.primaryAction} to="/demo">Изпробвай без профил</Link>
              <a className={styles.secondaryAction} href="#how-it-works">Виж процеса</a>
            </div>
            <span className={styles.formats}>Поддържа PDF, JPG, PNG и WebP документи</span>
          </div>

          <div className={styles.preview} aria-label="Пример за извлечени счетоводни данни">
            <div className={styles.paper}>
              <div className={styles.paperHeader}>
                <span>Фактура № 1048</span>
                <strong>Проверена</strong>
              </div>
              <dl>
                <div>
                  <dt>Доставчик</dt>
                  <dd>Пример ООД</dd>
                </div>
                <div>
                  <dt>Дата</dt>
                  <dd>25.07.2026</dd>
                </div>
                <div>
                  <dt>Данъчна основа</dt>
                  <dd>1 250,00 лв.</dd>
                </div>
                <div>
                  <dt>ДДС</dt>
                  <dd>250,00 лв.</dd>
                </div>
                <div>
                  <dt>Общо</dt>
                  <dd>1 500,00 лв.</dd>
                </div>
              </dl>
            </div>
          </div>
        </section>

        <section className={styles.section} id="features">
          <p className={styles.eyebrow}>От документ до готови данни</p>
          <h2>По-малко ръчно въвеждане, повече счетоводен контрол</h2>
          <div className={styles.benefitGrid}>
            {benefits.map(([title, text]) => (
              <article key={title}>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={`${styles.section} ${styles.process}`} id="how-it-works">
          <div>
            <p className={styles.eyebrow}>Ясен работен процес</p>
            <h2>Как работи OCR обработката</h2>
            <p>
              Системата не превръща непроверени стойности директно в окончателни
              счетоводни данни. Резултатът минава през автоматични проверки и човешко одобрение.
            </p>
          </div>
          <ol>
            <li><strong>Качване</strong><span>Добавяте фактура или касова бележка като PDF или изображение.</span></li>
            <li><strong>Разпознаване</strong><span>OCR извлича структурирани полета и позиции от документа.</span></li>
            <li><strong>Проверка</strong><span>Преглеждате предупрежденията и коригирате данните при нужда.</span></li>
            <li><strong>Одобрение</strong><span>Потвърдените документи влизат в отчети и експорти.</span></li>
          </ol>
        </section>

        <section className={styles.section} id="faq">
          <p className={styles.eyebrow}>Често задавани въпроси</p>
          <h2>OCR за счетоводни документи</h2>
          <div className={styles.faq}>
            <details>
              <summary>Какви данни се извличат от фактурите?</summary>
              <p>Доставчик, получател, данъчни номера, номер и дата на документа, валута, данъчна основа, ДДС, обща сума и редове с позиции, когато са налични.</p>
            </details>
            <details>
              <summary>Може ли да обработва касови бележки?</summary>
              <p>Да. Системата разпознава фактури и касови бележки от поддържаните изображения и PDF файлове.</p>
            </details>
            <details>
              <summary>Трябва ли резултатът да бъде проверен?</summary>
              <p>Да. OCR резултатът е чернова. Преди одобрение системата изпълнява проверки, а потребителят може да коригира всяко поле.</p>
            </details>
            <details>
              <summary>Документите публично достъпни ли са?</summary>
              <p>Не. Достъпът до качените счетоводни документи изисква вход и принадлежност към съответната фирма.</p>
            </details>
          </div>
        </section>

        <section className={styles.cta}>
          <div>
            <p className={styles.eyebrow}>Готови ли сте?</p>
            <h2>Обработвайте фактури и касови бележки по-бързо</h2>
          </div>
          <Link className={styles.primaryAction} to="/demo">Тествай OCR</Link>
        </section>
      </main>

      <footer className={styles.footer}>
        <span>© {new Date().getFullYear()} OCR Finance</span>
        <a href="mailto:pointsmart909@gmail.com">pointsmart909@gmail.com</a>
      </footer>
    </div>
  );
}

export default MarketingPage;
