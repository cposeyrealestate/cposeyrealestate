# IDX Broker Setup — Cody Posey Real Estate

This folder contains everything needed to wire up IDX Broker so the search experience looks native to cposeyrealestate.com.

## Files
- `wrapper.html` — site nav + footer + lead-CTA injection script. Goes into IDX → Design → Wrappers.
- `custom.css` — branding styles. Goes into IDX → Design → Website → Custom CSS.

## Setup Steps (do these in IDX Broker admin while logged in)

### 1. Create the wrapper

1. Go to **Design → Website → Wrappers**
2. Click **Add New Wrapper** (or the equivalent "+" button)
3. Name it: **Cody Posey Site Wrap**
4. Open `idx-integration/wrapper.html` in a text editor, copy the entire contents, paste into the wrapper HTML field
5. Save

### 2. Assign the wrapper as default

1. Same Wrappers screen → find the wrapper you just created
2. Set it as the **Global Wrapper** (or assign to **Search Pages** + **Details Pages** at minimum)
3. Save

### 3. Paste the custom CSS

1. Go to **Design → Website → Custom CSS**
2. Open `idx-integration/custom.css`, copy entire contents, paste in
3. Save

### 4. Confirm Account → MLS settings

1. Go to **Account → Office Information** (or Settings)
2. Make sure **Office name, agent name, phone, email** are correct — these show up on listing details

### 5. Test it

Visit the live IDX URL once setup is done:
- Search: `https://cposeyrealestate.idxbroker.com/idx/search/advanced`
- Map: `https://cposeyrealestate.idxbroker.com/idx/map/mapsearch`
- A details page: click any listing from search

You should see:
- Your black nav bar at the top (with Home Search highlighted)
- Footer at the bottom matching the main site
- On a listing detail page: a red **"Request More Info / Schedule Showing"** button instead of IDX's contact form

### 6. (Later) Move to a custom subdomain

Once everything works at `cposeyrealestate.idxbroker.com`, we'll set up `search.cposeyrealestate.com` as a CNAME pointing to IDX. That requires:
- Cloudflare DNS change (I'll guide you)
- IDX → Account → Domains → add `search.cposeyrealestate.com`

After that, all the URLs in the wrapper and the site nav get updated to use `search.cposeyrealestate.com`.

## Troubleshooting

- **The CTA button doesn't show on details pages**: open browser DevTools → Console, look for errors. The script polls for IDX content for 10 seconds, so if IDX uses class names different from what we anchor on, we'll need to adjust the selectors in `wrapper.html`.
- **Styles look broken**: clear your browser cache, then check that Custom CSS was saved. IDX caches templates aggressively — give it 1-2 minutes.
- **Nav links broken**: every URL in the wrapper is absolute (`https://cposeyrealestate.com/...`) on purpose because the wrapper runs on the IDX subdomain.
