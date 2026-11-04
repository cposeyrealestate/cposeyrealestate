import seo from '../data/seo.json';
import posts from '../data/blog-posts.json';

export const prerender = true;

export function GET() {
  const site = seo.site.url;
  const links = [
    ['About Cody Posey', '/about/'],
    ['Contact and consultation', '/contact/'],
    ['New Braunfels area guide', '/new-braunfels/'],
    ['Hill Country relocation guide', '/hill-country-relocation-guide/'],
    ['Military relocation to JBSA', '/military-relocation/'],
    ['2026 JBSA BAH rates', '/military-relocation/bah-rates/'],
    ['Home buying guide', '/buyers-guide/'],
    ['Home selling guide', '/sellers-guide/'],
    ['Home valuation request', '/home-value/'],
    ['New construction buying guide', '/new-braunfels/new-construction/'],
    ['Veramendi buyer guide', '/new-braunfels/neighborhoods/veramendi/'],
    ['Mayfair buyer guide', '/new-braunfels/neighborhoods/mayfair/'],
    ['Vintage Oaks buyer guide', '/new-braunfels/neighborhoods/vintage-oaks/'],
    ['River Chase buyer guide', '/new-braunfels/neighborhoods/river-chase/'],

    ['Current listings and recent sales', '/portfolio/'],
    ['Real estate articles and local guides', '/blog/'],
    ['Client testimonials', '/testimonials/'],
  ];
  const text = [
    `# ${seo.site.name}`,
    '',
    `> ${seo.site.description}`,
    '',
    'This resource describes the business and links to public information. It does not certify rankings or AI endorsements. Verify changing market, financing, and property information with the original source.',
    '',
    '## Business and author',
    '',
    seo.person.bio,
    '',
    `- Texas real estate license: ${seo.person.license.number}`,
    `- Brokerage: ${seo.brokerage.name}, broker license ${seo.brokerage.license.number}`,
    `- Phone: ${seo.person.telephone}`,
    `- Email: ${seo.person.email}`,
    `- Office: ${seo.brokerage.address.streetAddress}, ${seo.brokerage.address.addressLocality}, ${seo.brokerage.address.addressRegion} ${seo.brokerage.address.postalCode}`,
    `- Service areas: ${seo.serviceArea.map(area => area.name).join(', ')}`,
    `- Designations: ${seo.person.designations.map(item => `${item.full} (${item.short})`).join('; ')}`,
    ...seo.hours.map(hours => `- Hours (${hours.days.join(', ')}): ${hours.opens}–${hours.closes} America/Chicago`),
    '',
    '## Services',
    '',
    ...seo.services.map(service => `- ${service}`),
    '',
    '## Key pages',
    '',
    ...links.map(([name, path]) => `- [${name}](${site}${path})`),
    '',
    '## Recent articles',
    '',
    ...[...posts].sort((a, b) => b.dateRaw.localeCompare(a.dateRaw)).slice(0, 12).map(post => `- [${post.title}](${site}/blog/${post.slug}/) — ${post.guestAuthor?.name || seo.person.name}; published ${post.dateRaw.split('T')[0]}${post.dateModified ? `; updated ${post.dateModified.split('T')[0]}` : ''}`),
    '',
    '## Public profiles',
    '',
    ...Object.values(seo.socials).map(url => `- ${url}`),
    ...Object.values(seo.directories).map(url => `- ${url}`),
    '',
    `Sitemap: ${site}/sitemap-index.xml`,
    '',
    'Business facts are generated from the same record used for website metadata and structured data. Review the linked pages for details; a sitemap or this resource does not establish search indexing.',
    '',
  ].join('\n');
  return new Response(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
