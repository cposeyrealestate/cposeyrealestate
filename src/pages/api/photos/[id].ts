export const prerender = false;

import type { APIRoute } from 'astro';

const IDX_BASE = 'https://cposeyrealestate.idxbroker.com';
const MLS_ID = 'a023';

function cleanValue(val: string): string {
  return val.replace(/\s+/g, ' ').trim();
}

export const GET: APIRoute = async ({ params }) => {
  const listingId = params.id;
  if (!listingId) {
    return new Response(JSON.stringify({ error: 'Missing listing ID' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Scrape the IDX Broker detail page — this has full listing data
    const pageUrl = `${IDX_BASE}/idx/details/listing/${MLS_ID}/${listingId}`;
    const res = await fetch(pageUrl);

    if (!res.ok) {
      return new Response(JSON.stringify({ error: `IDX page error: ${res.status}` }), {
        status: res.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const html = await res.text();

    // Extract photos — all image URLs matching the MLS CDN pattern
    const photos: string[] = [];
    const imgRegex = /(https?:\/\/[^\s"'<>]+\.(?:jpg|jpeg|png|webp))/gi;
    let m: RegExpExecArray | null;
    while ((m = imgRegex.exec(html)) !== null) {
      if (!photos.includes(m[1])) photos.push(m[1]);
    }

    // Extract full description from meta tag
    const descMatch = html.match(/meta name="description" content="([^"]*)"/);
    const description = descMatch ? descMatch[1].replace(/&#039;/g, "'").replace(/&amp;/g, '&').replace(/&quot;/g, '"') : '';

    // Extract all IDX fields
    const fields: Record<string, string> = {};
    const fieldRegex = /IDX-field-(\w+)[^"]*"[^>]*><span class="IDX-label">([^<]*)<\/span><span class="IDX-text">([^<]*)<\/span>/g;
    while ((m = fieldRegex.exec(html)) !== null) {
      fields[m[1]] = cleanValue(m[3]);
    }

    // Also check for multi-line IDX-text values (some fields have whitespace)
    const fieldRegex2 = /IDX-field-(\w+)[^"]*"[^>]*><span class="IDX-label">([^<]*)<\/span><span class="IDX-text">([\s\S]*?)<\/span>/g;
    while ((m = fieldRegex2.exec(html)) !== null) {
      if (!fields[m[1]]) {
        fields[m[1]] = cleanValue(m[3]);
      }
    }

    // Build the response
    const details: Record<string, any> = {
      photos,
      description,
      garage: parseInt(fields.garage) || 0,
      stories: parseInt(fields.numOfStories) || 0,
      fullBaths: parseInt(fields.fullBaths) || 0,
      halfBaths: parseInt(fields.halfBaths) || 0,
      partialBaths: parseInt(fields.partialBaths) || 0,
      listingAgent: fields.listingAgent || fields.listingAgentName || '',
      listingOffice: fields.listingOffice || fields.listingOfficeName || '',
      schoolElementary: fields.elementarySchool || '',
      schoolMiddle: fields.middleSchool || '',
      schoolHigh: fields.highSchool || '',
      schoolDistrict: fields.schoolDistrict || '',
      hoa: fields.hoaFee || fields.hoaMandatory || '',
      hoaFreq: fields.hoaFrequency || '',
      cooling: fields.airConditioning || '',
      heating: fields.heating || '',
      flooring: fields.floor || '',
      roof: fields.roof || '',
      construction: fields.construction || '',
      parking: fields.parking || '',
      pool: fields.poolYN || '',
      appliances: fields.inclusions || '',
      interior: fields.interior || '',
      exterior: fields.exterior || '',
      exteriorFeatures: fields.exteriorFeatures || '',
      lotFeatures: fields.lotDescription || '',
      waterSource: fields.utilitySupplierWater || '',
      sewer: fields.utilitySupplierSewer || '',
      utilities: '',
      foundation: fields.foundation || '',
      fireplace: fields.fireplace2 || '',
      laundry: '',
      windows: fields.energyEfficiency || '',
      style: fields.style || '',
      basement: fields.basement || '',
      patioAndPorch: '',
      masterBedroom: fields.masterBedroom || '',
      masterBath: fields.masterBath || '',
      totalTax: fields.totalTax || '',
      proposedTerms: fields.proposedTerms || '',
      homeFaces: fields.homeFaces || '',
      lotImprovements: fields.lotImprovements || '',
      neighborhoodAmenities: fields.neighborhoodAmenities || '',
      heatingFuel: fields.heatingFuel || '',
    };

    // Remove empty/zero values
    for (const key of Object.keys(details)) {
      if (details[key] === '' || details[key] === 0 || details[key] === 'None' || details[key] === 'no') {
        delete details[key];
      }
    }

    return new Response(JSON.stringify(details), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Failed to fetch listing details' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
