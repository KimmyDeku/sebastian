import * as cheerio from "cheerio";
import { fetchText } from "./http";

export const NEWS_SOURCES: Record<string, { name: string; home: string; feeds: Record<string, string> }> = {
  bbc: { name: "BBC", home: "https://www.bbc.com/news", feeds: {
    top: "https://feeds.bbci.co.uk/news/rss.xml", science: "https://feeds.bbci.co.uk/news/science_and_environment/rss.xml",
    technology: "https://feeds.bbci.co.uk/news/technology/rss.xml", politics: "https://feeds.bbci.co.uk/news/politics/rss.xml",
    business: "https://feeds.bbci.co.uk/news/business/rss.xml", economy: "https://feeds.bbci.co.uk/news/business/rss.xml",
    social: "https://feeds.bbci.co.uk/news/education/rss.xml", world: "https://feeds.bbci.co.uk/news/world/rss.xml" } },
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
    social: "https://moxie.foxnews.com/google-publisher/health.xml", world: "https://moxie.foxnews.com/google-publisher/world.xml" } },
  zbc: { name: "ZBC News", home: "https://www.zbcnews.co.zw/", feeds: { top: "https://www.zbcnews.co.zw/feed/" } },
};

export const NEWS_CATEGORIES = ["top", "science", "technology", "politics", "economy", "business", "social", "weather", "world", "other"];

const KEYWORDS: Record<string, RegExp> = {
  science: /scien|space|nasa|research|climate|species|physics|study finds/i,
  technology: /tech|\bai\b|artificial intelligence|software|apple|google|microsoft|cyber|chip|app\b|smartphone|robot/i,
  politics: /elect|minister|president|parliament|senate|congress|policy|vote|government|party|campaign/i,
  economy: /econom|inflation|interest rate|gdp|central bank|currency|recession|tariff|jobs report|unemployment/i,
  business: /business|compan|market|stocks?|shares|profit|ceo|merger|bank|trade/i,
  social: /health|school|education|community|famil|society|culture|welfare|housing|children|women/i,
  weather: /weather|storm|rain|flood|heatwave|heat wave|cyclone|hurricane|drought|snow|wildfire|temperature|forecast/i,
  world: /./,
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
