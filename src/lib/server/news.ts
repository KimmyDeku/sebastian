import * as cheerio from "cheerio";
import { fetchText } from "./http";

export const NEWS_SOURCES: Record<string, { name: string; home: string; feeds: Record<string, string> }> = {
  bbc: { name: "BBC", home: "https://www.bbc.com/news", feeds: {
    top: "https://feeds.bbci.co.uk/news/rss.xml", science: "https://feeds.bbci.co.uk/news/science_and_environment/rss.xml",
    technology: "https://feeds.bbci.co.uk/news/technology/rss.xml", politics: "https://feeds.bbci.co.uk/news/politics/rss.xml",
    business: "https://feeds.bbci.co.uk/news/business/rss.xml", economy: "https://feeds.bbci.co.uk/news/business/rss.xml",
    social: "https://feeds.bbci.co.uk/news/education/rss.xml", world: "https://feeds.bbci.co.uk/news/world/rss.xml",
    sport: "https://feeds.bbci.co.uk/sport/rss.xml", entertainment: "https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml", health: "https://feeds.bbci.co.uk/news/health/rss.xml",
    education: "https://feeds.bbci.co.uk/news/education/rss.xml", environment: "https://feeds.bbci.co.uk/news/science_and_environment/rss.xml" } },
  cnn: { name: "CNN", home: "https://edition.cnn.com/", feeds: {
    top: "http://rss.cnn.com/rss/edition.rss", technology: "http://rss.cnn.com/rss/edition_technology.rss",
    science: "http://rss.cnn.com/rss/edition_space.rss", business: "http://rss.cnn.com/rss/money_news_international.rss",
    economy: "http://rss.cnn.com/rss/money_news_international.rss", politics: "http://rss.cnn.com/rss/cnn_allpolitics.rss", world: "http://rss.cnn.com/rss/edition_world.rss" } },
  abc: { name: "ABC News", home: "https://abcnews.go.com/", feeds: {
    top: "https://abcnews.go.com/abcnews/topstories", politics: "https://abcnews.go.com/abcnews/politicsheadlines",
    technology: "https://abcnews.go.com/abcnews/technologyheadlines", business: "https://abcnews.go.com/abcnews/moneyheadlines",
    economy: "https://abcnews.go.com/abcnews/moneyheadlines", social: "https://abcnews.go.com/abcnews/healthheadlines", world: "https://abcnews.go.com/abcnews/internationalheadlines" } },
  aljazeera: { name: "Al Jazeera", home: "https://www.aljazeera.com/", feeds: { top: "https://www.aljazeera.com/xml/rss/all.xml" } },
  sky: { name: "Sky News", home: "https://news.sky.com/", feeds: {
    top: "https://feeds.skynews.com/feeds/rss/home.xml", world: "https://feeds.skynews.com/feeds/rss/world.xml",
    business: "https://feeds.skynews.com/feeds/rss/business.xml", economy: "https://feeds.skynews.com/feeds/rss/business.xml",
    politics: "https://feeds.skynews.com/feeds/rss/politics.xml", technology: "https://feeds.skynews.com/feeds/rss/technology.xml" } },
  fox: { name: "Fox News", home: "https://www.foxnews.com/", feeds: {
    top: "https://moxie.foxnews.com/google-publisher/latest.xml", politics: "https://moxie.foxnews.com/google-publisher/politics.xml",
    technology: "https://moxie.foxnews.com/google-publisher/tech.xml", science: "https://moxie.foxnews.com/google-publisher/science.xml",
    social: "https://moxie.foxnews.com/google-publisher/health.xml", world: "https://moxie.foxnews.com/google-publisher/world.xml",
    sport: "https://moxie.foxnews.com/google-publisher/sports.xml", entertainment: "https://moxie.foxnews.com/google-publisher/entertainment.xml", travel: "https://moxie.foxnews.com/google-publisher/travel.xml", health: "https://moxie.foxnews.com/google-publisher/health.xml" } },
  zbc: { name: "ZBC News", home: "https://www.zbcnews.co.zw/", feeds: { top: "https://www.zbcnews.co.zw/feed/" } },
  // ---- Other channels around the world ----
  guardian: { name: "The Guardian", home: "https://www.theguardian.com/", feeds: {
    top: "https://www.theguardian.com/world/rss", world: "https://www.theguardian.com/world/rss", science: "https://www.theguardian.com/science/rss",
    technology: "https://www.theguardian.com/technology/rss", politics: "https://www.theguardian.com/politics/rss", business: "https://www.theguardian.com/business/rss",
    economy: "https://www.theguardian.com/business/economics/rss", music: "https://www.theguardian.com/music/rss", sport: "https://www.theguardian.com/sport/rss",
    money: "https://www.theguardian.com/money/rss", travel: "https://www.theguardian.com/travel/rss", culture: "https://www.theguardian.com/culture/rss",
    film: "https://www.theguardian.com/film/rss", lifestyle: "https://www.theguardian.com/lifeandstyle/rss", environment: "https://www.theguardian.com/environment/rss",
    education: "https://www.theguardian.com/education/rss", health: "https://www.theguardian.com/society/health/rss", fashion: "https://www.theguardian.com/fashion/rss",
    food: "https://www.theguardian.com/food/rss", books: "https://www.theguardian.com/books/rss" } },
  npr: { name: "NPR", home: "https://www.npr.org/", feeds: { top: "https://feeds.npr.org/1001/rss.xml", music: "https://feeds.npr.org/1039/rss.xml", health: "https://feeds.npr.org/1128/rss.xml", science: "https://feeds.npr.org/1007/rss.xml", technology: "https://feeds.npr.org/1019/rss.xml", business: "https://feeds.npr.org/1006/rss.xml", politics: "https://feeds.npr.org/1014/rss.xml", books: "https://feeds.npr.org/1032/rss.xml" } },
  dw: { name: "DW (Germany)", home: "https://www.dw.com/en/", feeds: { top: "https://rss.dw.com/rdf/rss-en-all" } },
  france24: { name: "France 24", home: "https://www.france24.com/en/", feeds: { top: "https://www.france24.com/en/rss" } },
  euronews: { name: "Euronews", home: "https://www.euronews.com/", feeds: { top: "https://www.euronews.com/rss" } },
  cbc: { name: "CBC (Canada)", home: "https://www.cbc.ca/news", feeds: { top: "https://www.cbc.ca/webfeed/rss/rss-topstories", world: "https://www.cbc.ca/webfeed/rss/rss-world", technology: "https://www.cbc.ca/webfeed/rss/rss-technology", sport: "https://www.cbc.ca/webfeed/rss/rss-sports", health: "https://www.cbc.ca/webfeed/rss/rss-health", business: "https://www.cbc.ca/webfeed/rss/rss-business" } },
  abcau: { name: "ABC Australia", home: "https://www.abc.net.au/news", feeds: { top: "https://www.abc.net.au/news/feed/51120/rss.xml" } },
  toi: { name: "Times of India", home: "https://timesofindia.indiatimes.com/", feeds: { top: "https://timesofindia.indiatimes.com/rssfeedstopstories.cms" } },
  scmp: { name: "South China Morning Post", home: "https://www.scmp.com/", feeds: { top: "https://www.scmp.com/rss/91/feed" } },
  japantimes: { name: "The Japan Times", home: "https://www.japantimes.co.jp/", feeds: { top: "https://www.japantimes.co.jp/feed/" } },
  cna: { name: "CNA (Singapore)", home: "https://www.channelnewsasia.com/", feeds: { top: "https://www.channelnewsasia.com/rssfeeds/8395986" } },
  news24: { name: "News24 (South Africa)", home: "https://www.news24.com/", feeds: { top: "https://feeds.news24.com/articles/news24/TopStories/rss" } },
  herald: { name: "The Herald (Zimbabwe)", home: "https://www.herald.co.zw/", feeds: { top: "https://www.herald.co.zw/feed/" } },
  newsday: { name: "NewsDay (Zimbabwe)", home: "https://www.newsday.co.zw/", feeds: { top: "https://www.newsday.co.zw/feed/" } },
  rte: { name: "RTÉ (Ireland)", home: "https://www.rte.ie/news/", feeds: { top: "https://www.rte.ie/feeds/rss/?index=/news/" } },
};

export const NEWS_CATEGORIES = ["top", "science", "technology", "politics", "economy", "business", "social", "weather", "world", "music", "sport", "money", "entertainment", "film", "health", "travel", "culture", "fashion", "food", "books", "lifestyle", "environment", "education"];

const KEYWORDS: Record<string, RegExp> = {
  science: /scien|space|nasa|research|climate|species|physics|study finds/i,
  technology: /tech|\bai\b|artificial intelligence|software|apple|google|microsoft|cyber|chip|app\b|smartphone|robot/i,
  politics: /elect|minister|president|parliament|senate|congress|policy|vote|government|party|campaign/i,
  economy: /econom|inflation|interest rate|gdp|central bank|currency|recession|tariff|jobs report|unemployment/i,
  business: /business|compan|market|stocks?|shares|profit|ceo|merger|bank|trade/i,
  social: /health|school|education|community|famil|society|culture|welfare|housing|children|women/i,
  weather: /weather|storm|rain|flood|heatwave|heat wave|cyclone|hurricane|drought|snow|wildfire|temperature|forecast/i,
  world: /./,
  music: /music|album|song|singer|concert|tour|band|rapper|grammy|chart|festival/i,
  sport: /sport|football|soccer|cricket|rugby|tennis|olympic|league|cup|match|athlet|nba|nfl|f1|formula one|golf|boxing/i,
  money: /money|savings|mortgage|pension|tax|price|cost of living|interest rate|loan|credit|salary|wage|inflation|budget/i,
  entertainment: /film|movie|tv|television|celebrity|actor|actress|star|show|netflix|hollywood|music|award/i,
  film: /film|movie|cinema|box office|director|actor|actress|oscar|hollywood/i,
  health: /health|hospital|doctor|disease|virus|vaccine|cancer|medical|mental health|nhs|patients?/i,
  travel: /travel|tourism|tourist|flight|airline|airport|holiday|hotel|visa|destination/i,
  culture: /art|artist|museum|culture|exhibition|theatre|book|novel|heritage|festival/i,
  fashion: /fashion|designer|runway|style|clothing|model|couture|brand/i,
  food: /food|restaurant|chef|recipe|cooking|cuisine|dining|wine/i,
  books: /book|novel|author|writer|literary|publish/i,
  lifestyle: /lifestyle|wellbeing|well-being|relationship|parenting|home|garden|fitness/i,
  environment: /climate|environment|pollution|wildlife|conservation|carbon|emissions|renewable|forest/i,
  education: /school|education|university|student|teacher|exam|college/i,
};

export interface NewsItem { id: string; source: string; sourceName: string; title: string; summary: string; link: string; image?: string; published?: string; category: string; status: "breaking" | "developing" | "latest" }

async function readFeed(sourceKey: string, cat: string, url: string): Promise<NewsItem[]> {
  const xml = await fetchText(url, 8000, { accept: "application/rss+xml, application/xml, text/xml" });
  const $ = cheerio.load(xml, { xmlMode: true });
  const items: NewsItem[] = [];
  $("item").each((i, el) => {
    if (i > 25) return;
    const it = $(el);
    const title = it.find("title").first().text().trim();
    const link = (it.find("link").first().text() || it.find("guid").first().text()).trim();
    if (!title || !link.startsWith("http")) return;
    const rawDesc = it.find("description").first().text();
    const summary = cheerio.load(`<div>${rawDesc}</div>`)("div").text().replace(/\s+/g, " ").trim().slice(0, 240);
    const image =
      it.find("media\\:thumbnail").attr("url") || it.find("media\\:content").attr("url") || it.find("enclosure").attr("url") ||
      cheerio.load(rawDesc)("img").attr("src") || undefined;
    const pub = it.find("pubDate").text() || it.find("dc\\:date").text();
    const published = pub ? new Date(pub).toISOString() : undefined;
    const ageH = published ? (Date.now() - new Date(published).getTime()) / 3.6e6 : 99;
    const status = /breaking|^live[:\s]/i.test(title) || ageH < 1 ? "breaking" : /live|update|developing|latest/i.test(title) || ageH < 6 ? "developing" : "latest";
    items.push({ id: sourceKey + ":" + link, source: sourceKey, sourceName: NEWS_SOURCES[sourceKey].name, title, summary, link, image, published, category: cat, status });
  });
  return items;
}

async function ogImage(url: string) {
  try {
    const html = await fetchText(url, 4000);
    return cheerio.load(html)('meta[property="og:image"]').attr("content");
  } catch { return undefined; }
}

export async function getNews(sources: string[], categories: string[]) {
  const cats = categories.length ? categories : ["top"];
  const jobs: Promise<NewsItem[]>[] = [];
  const failures: string[] = [];
  for (const s of sources) {
    const src = NEWS_SOURCES[s];
    if (!src) continue;
    const used = new Set<string>();
    for (const c of cats) {
      const url = src.feeds[c] || src.feeds.top;
      const key = url + "|" + c;
      if (used.has(key)) continue;
      used.add(key);
      jobs.push(
        readFeed(s, c, url).then((items) => (src.feeds[c] || c === "top" ? items : items.filter((x) => (KEYWORDS[c] || /./).test(x.title + " " + x.summary))))
          .catch(() => { failures.push(src.name); return []; })
      );
    }
  }
  const all = (await Promise.all(jobs)).flat();
  const seen = new Set<string>();
  const unique = all.filter((x) => (seen.has(x.link) ? false : (seen.add(x.link), true)));
  unique.sort((a, b) => (b.published || "").localeCompare(a.published || ""));
  const top = unique.slice(0, 48);
  await Promise.all(top.slice(0, 18).map(async (x) => { if (!x.image) x.image = await ogImage(x.link); }));
  return { items: top, failures: [...new Set(failures)], fetchedAt: new Date().toISOString() };
}
