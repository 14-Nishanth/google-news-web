import Parser from 'rss-parser';

const parser = new Parser();
const TOPICS = new Set([
  'WORLD',
  'NATION',
  'BUSINESS',
  'TECHNOLOGY',
  'ENTERTAINMENT',
  'SPORTS',
  'SCIENCE',
  'HEALTH'
]);

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { search, category, region = 'US', language = 'en', limit = '15' } = req.query;

    const formattedRegion = region.toUpperCase();
    const formattedLanguage = language.toLowerCase();
    const parsedLimit = parseInt(limit, 10) || 15;
    const ceid = `${formattedRegion}:${formattedLanguage}`;

    let url = `https://news.google.com/rss?hl=${formattedLanguage}&gl=${formattedRegion}&ceid=${ceid}`;

    if (search) {
      url = `https://news.google.com/rss/search?q=${encodeURIComponent(search)}&hl=${formattedLanguage}&gl=${formattedRegion}&ceid=${ceid}`;
    } else if (category && category.toLowerCase() !== 'headlines') {
      const formattedCategory = category.toUpperCase();
      if (TOPICS.has(formattedCategory)) {
        url = `https://news.google.com/rss/headlines/section/topic/${formattedCategory}?hl=${formattedLanguage}&gl=${formattedRegion}&ceid=${ceid}`;
      } else {
        return res.status(400).json({ error: `Invalid category. Choose from: ${Array.from(TOPICS).join(', ').toLowerCase()}` });
      }
    }

    const feed = await parser.parseURL(url);
    
    // Process and format the feed items
    const articles = (feed.items || []).slice(0, parsedLimit).map(item => {
      let title = item.title || 'No Title';
      let source = 'Google News';

      // Parse source from the title if suffixed by Google News (e.g. "Headline - Source Name")
      const lastHyphen = title.lastIndexOf(' - ');
      if (lastHyphen !== -1) {
        source = title.substring(lastHyphen + 3).trim();
        title = title.substring(0, lastHyphen).trim();
      }

      return {
        title,
        source,
        link: item.link,
        pubDate: item.pubDate ? new Date(item.pubDate).toISOString() : null,
        description: item.contentSnippet || item.content || ''
      };
    });

    res.status(200).json({
      title: feed.title || 'Google News',
      link: feed.link || 'https://news.google.com',
      articles
    });

  } catch (error) {
    console.error('Error fetching Google News feed:', error);
    res.status(500).json({ 
      error: 'Failed to fetch news from Google News feed', 
      details: error.message 
    });
  }
}
