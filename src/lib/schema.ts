/**
 * Schema.org JSON-LD builders for the Cody Posey Real Estate site.
 *
 * All builders read canonical business data from src/data/seo.json so that
 * the license numbers, hours, address, socials, etc. are maintained in one
 * place and propagate consistently to every page's structured data.
 */

import seo from '../data/seo.json';

const SITE = seo.site.url;
const PERSON_ID = `${SITE}#person-cody-posey`;
const ORG_ID = `${SITE}#org-popby-realty`;
const WEBSITE_ID = `${SITE}#website`;
const BUSINESS_ID = `${SITE}#business`;

function allSameAsUrls(): string[] {
  const s = seo.socials as Record<string, string>;
  const d = seo.directories as Record<string, string>;
  return [
    s.facebook,
    s.instagram,
    s.tiktok,
    s.youtubePrimary,
    s.youtubeSecondary,
    s.linkedin,
    d.zillow,
    d.realtorDotCom,
    d.fastExpert,
    d.homeLight,
    d.homesDotCom,
    d.googleBusinessReview,
  ].filter(Boolean);
}

function openingHoursSpec() {
  return seo.hours
    .filter((h: any) => h.opens && h.closes)
    .map((h: any) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: h.days,
      opens: h.opens,
      closes: h.closes,
    }));
}

function serviceAreaList() {
  return seo.serviceArea.map((a: any) => ({
    '@type': 'City',
    name: a.name,
    addressRegion: a.state,
  }));
}

/* ── Core entity: Cody Posey, the Person / RealEstateAgent ────────── */
export function personSchema() {
  const person: any = {
    '@context': 'https://schema.org',
    '@type': ['Person', 'RealEstateAgent'],
    '@id': PERSON_ID,
    name: seo.person.name,
    givenName: seo.person.givenName,
    familyName: seo.person.familyName,
    jobTitle: seo.person.jobTitle,
    description: seo.person.bio,
    image: seo.person.image,
    telephone: seo.person.telephone,
    email: `mailto:${seo.person.email}`,
    url: SITE,
    worksFor: { '@id': ORG_ID },
    knowsLanguage: seo.person.languages,
    slogan: seo.site.tagline,
    hasOccupation: {
      '@type': 'Occupation',
      name: 'Real Estate Agent',
      occupationLocation: serviceAreaList(),
      skills: seo.services.join(', '),
      qualifications: `Licensed by the Texas Real Estate Commission (TREC #${seo.person.license.number}) since ${seo.person.license.since}.`,
    },
    hasCredential: [
      {
        '@type': 'EducationalOccupationalCredential',
        name: `Real Estate Salesperson License ${seo.person.license.number}`,
        credentialCategory: 'license',
        recognizedBy: {
          '@type': 'Organization',
          name: seo.person.license.authority,
          url: 'https://www.trec.texas.gov/',
        },
      },
      ...seo.person.designations.map((d: any) => ({
        '@type': 'EducationalOccupationalCredential',
        name: d.full,
        credentialCategory: 'certification',
        recognizedBy: {
          '@type': 'Organization',
          name: 'National Association of REALTORS®',
          url: 'https://www.nar.realtor/',
        },
      })),
    ],
    award: seo.person.designations.map((d: any) => `${d.full} (${d.short})`),
    memberOf: seo.person.memberOf.map((m: any) => ({
      '@type': 'Organization',
      name: m.name,
      url: m.url,
    })),
    knowsAbout: seo.services,
    areaServed: serviceAreaList(),
    sameAs: allSameAsUrls(),
  };
  // Attach aggregateRating only if we have review data
  if (seo.reviews?.reviewCount > 0) {
    person.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: seo.reviews.aggregateRating,
      reviewCount: seo.reviews.reviewCount,
      bestRating: 5,
      worstRating: 1,
    };
  }
  return person;
}

/* ── Brokerage: Popby Realty as an Organization ───────────────────── */
export function brokerageSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': ['RealEstateAgent', 'LocalBusiness'],
    '@id': ORG_ID,
    name: seo.brokerage.name,
    telephone: seo.brokerage.telephone,
    address: {
      '@type': 'PostalAddress',
      ...seo.brokerage.address,
    },
    logo: seo.brokerage.logo,
    identifier: {
      '@type': 'PropertyValue',
      propertyID: 'TREC Broker License',
      value: seo.brokerage.license.number,
    },
  };
}

/* ── The overall LocalBusiness entity (what Google uses for the panel) */
export function localBusinessSchema() {
  const biz: any = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateAgent',
    '@id': BUSINESS_ID,
    name: seo.site.name,
    alternateName: seo.person.name,
    description: seo.site.description,
    slogan: seo.site.tagline,
    url: SITE,
    image: seo.person.image,
    logo: seo.brokerage.logo,
    telephone: seo.person.telephone,
    email: `mailto:${seo.person.email}`,
    address: {
      '@type': 'PostalAddress',
      ...seo.brokerage.address,
    },
    openingHoursSpecification: openingHoursSpec(),
    areaServed: serviceAreaList(),
    founder: { '@id': PERSON_ID },
    employee: { '@id': PERSON_ID },
    parentOrganization: { '@id': ORG_ID },
    priceRange: '$$',
    sameAs: allSameAsUrls(),
    knowsAbout: seo.services,
    award: seo.person.designations.map((d: any) => `${d.full} (${d.short})`),
    memberOf: seo.person.memberOf.map((m: any) => ({
      '@type': 'Organization',
      name: m.name,
      url: m.url,
    })),
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Real Estate Services',
      itemListElement: seo.services.map((svc: string) => ({
        '@type': 'Offer',
        itemOffered: { '@type': 'Service', name: svc, provider: { '@id': PERSON_ID }, areaServed: serviceAreaList() },
      })),
    },
  };
  if (seo.reviews?.reviewCount > 0) {
    biz.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: seo.reviews.aggregateRating,
      reviewCount: seo.reviews.reviewCount,
      bestRating: 5,
      worstRating: 1,
    };
  }
  return biz;
}

/* ── Review items for the Testimonials page ─────────────────────── */
export function reviewsSchema(reviews: Array<{ name: string; role?: string; quote: string; rating?: number }>) {
  return reviews.map((r) => ({
    '@context': 'https://schema.org',
    '@type': 'Review',
    itemReviewed: { '@id': BUSINESS_ID },
    author: { '@type': 'Person', name: r.name, ...(r.role && { jobTitle: r.role }) },
    reviewBody: r.quote,
    reviewRating: {
      '@type': 'Rating',
      ratingValue: r.rating ?? 5,
      bestRating: 5,
      worstRating: 1,
    },
  }));
}

/* ── WebSite entity (enables Google sitelinks search box eligibility) */
export function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    name: seo.site.name,
    url: SITE,
    inLanguage: seo.site.locale.replace('_', '-'),
    publisher: { '@id': BUSINESS_ID },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

/* ── Homepage: bundle the full entity graph ───────────────────────── */
export function homepageSchema() {
  return [personSchema(), brokerageSchema(), localBusinessSchema(), websiteSchema()];
}

/* ── BreadcrumbList helper — pass ordered [name, url] pairs ───────── */
export function breadcrumbSchema(items: Array<{ name: string; url: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: new URL(item.url, SITE).toString(),
    })),
  };
}

/* ── FAQPage from an array of {q, a} ──────────────────────────────── */
export function faqSchema(items: Array<{ q: string; a: string }>) {
  if (!items || items.length === 0) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((qa) => ({
      '@type': 'Question',
      name: qa.q,
      acceptedAnswer: { '@type': 'Answer', text: qa.a },
    })),
  };
}

/* ── BlogPosting for individual blog posts ────────────────────────── */
export function blogPostingSchema(post: {
  title: string;
  slug: string;
  excerpt: string;
  dateRaw: string;
  category?: string;
  featuredImage?: string;
}) {
  const url = `${SITE}/blog/${post.slug}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    '@id': `${url}#post`,
    headline: post.title,
    description: post.excerpt,
    image: post.featuredImage || seo.site.defaultOgImage,
    datePublished: post.dateRaw,
    dateModified: post.dateRaw,
    author: { '@id': PERSON_ID },
    publisher: { '@id': BUSINESS_ID },
    articleSection: post.category || 'Blog',
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url,
    },
    inLanguage: seo.site.locale.replace('_', '-'),
  };
}

/* ── Place schema for area/city hub pages ───────────────────────── */
export function placeSchema(place: {
  name: string;          // e.g. "New Braunfels, TX"
  description: string;
  url: string;           // relative path, e.g. "/new-braunfels"
  image?: string;
  state?: string;        // default "TX"
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Place',
    name: place.name,
    description: place.description,
    url: new URL(place.url, SITE).toString(),
    ...(place.image && {
      image: place.image.startsWith('http') ? place.image : new URL(place.image, SITE).toString(),
    }),
    address: {
      '@type': 'PostalAddress',
      addressLocality: place.name.split(',')[0].trim(),
      addressRegion: place.state || 'TX',
      addressCountry: 'US',
    },
  };
}

/* ── Article schema for guide/resource pages ─────────────────────── */
export function articleSchema(article: {
  title: string;
  description: string;
  url: string;
  image?: string;
  datePublished?: string;
  dateModified?: string;
}) {
  const url = new URL(article.url, SITE).toString();
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    '@id': `${url}#article`,
    headline: article.title,
    description: article.description,
    url,
    ...(article.image && {
      image: article.image.startsWith('http') ? article.image : new URL(article.image, SITE).toString(),
    }),
    author: { '@id': PERSON_ID },
    publisher: { '@id': BUSINESS_ID },
    ...(article.datePublished && { datePublished: article.datePublished }),
    ...(article.dateModified && { dateModified: article.dateModified || article.datePublished }),
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    inLanguage: seo.site.locale.replace('_', '-'),
  };
}

/* ── CollectionPage for area hubs listing sub-pages ──────────────── */
export function collectionPageSchema(collection: {
  name: string;
  description: string;
  url: string;
  hasPart?: Array<{ name: string; url: string }>;
}) {
  const url = new URL(collection.url, SITE).toString();
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${url}#collection`,
    name: collection.name,
    description: collection.description,
    url,
    isPartOf: { '@id': WEBSITE_ID },
    about: { '@id': BUSINESS_ID },
    ...(collection.hasPart && {
      hasPart: collection.hasPart.map((part) => ({
        '@type': 'WebPage',
        name: part.name,
        url: new URL(part.url, SITE).toString(),
      })),
    }),
  };
}

/* ── ContactPage schema ──────────────────────────────────────────── */
export function contactPageSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    '@id': `${SITE}/contact#contactpage`,
    name: `Contact ${seo.person.name} — ${seo.site.name}`,
    url: `${SITE}/contact`,
    about: { '@id': BUSINESS_ID },
    mainEntity: { '@id': BUSINESS_ID },
  };
}

/* ── RealEstateListing for /portfolio/[id] detail pages ───────────── */
export function listingSchema(listing: {
  address: string;
  city: string;
  price?: string;
  beds?: number;
  baths?: number;
  sqft?: string;
  acres?: string;
  propertyType?: string;
  description?: string;
  img: string;
  url: string;
  status?: string;
}) {
  // Parse "New Braunfels, TX 78130" → { locality, region, postal }
  const cityMatch = listing.city.match(/^([^,]+),\s*([A-Z]{2})\s*(\d{5})?$/);
  const locality = cityMatch ? cityMatch[1].trim() : listing.city;
  const region = cityMatch ? cityMatch[2] : 'TX';
  const postalCode = cityMatch?.[3];

  const status = (listing.status || 'Active').toLowerCase();
  const availability =
    status === 'sold'
      ? 'https://schema.org/SoldOut'
      : status === 'pending'
        ? 'https://schema.org/PreOrder'
        : 'https://schema.org/InStock';

  return {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    '@id': `${listing.url}#listing`,
    name: `${listing.address}, ${listing.city}`,
    description: listing.description || `${listing.propertyType || 'Home'} at ${listing.address}, ${listing.city}.`,
    url: new URL(listing.url, SITE).toString(),
    image: listing.img.startsWith('http') ? listing.img : new URL(listing.img, SITE).toString(),
    datePosted: new Date().toISOString().split('T')[0],
    address: {
      '@type': 'PostalAddress',
      streetAddress: listing.address,
      addressLocality: locality,
      addressRegion: region,
      ...(postalCode && { postalCode }),
      addressCountry: 'US',
    },
    offers: {
      '@type': 'Offer',
      availability,
      ...(listing.price && { price: listing.price.replace(/[^0-9]/g, ''), priceCurrency: 'USD' }),
      seller: { '@id': PERSON_ID },
    },
    ...(listing.beds && { numberOfRooms: listing.beds }),
    ...(listing.baths && { numberOfBathroomsTotal: listing.baths }),
    ...(listing.sqft && {
      floorSize: {
        '@type': 'QuantitativeValue',
        value: parseInt(listing.sqft.replace(/[^0-9]/g, ''), 10),
        unitCode: 'FTK', // square feet
      },
    }),
    ...(listing.acres && {
      lotSize: {
        '@type': 'QuantitativeValue',
        value: parseFloat(listing.acres),
        unitCode: 'ACR',
      },
    }),
  };
}
