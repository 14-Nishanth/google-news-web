import express from 'express';
import cors from 'cors';
import Parser from 'rss-parser';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const port = process.env.PORT || 3000;
const parser = new Parser();

// Get directory name of current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Enable CORS for all origins
app.use(cors());

// Serve static assets from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Supported topics in Google News
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

// Proxy endpoint for news RSS
app.get('/api/news', async (req, res) => {
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

    res.json({
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
});

// Fallback to index.html for single-page applications or routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`Google News Web App is running at http://localhost:${port}`);
});
